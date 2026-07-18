import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderConfigService } from '../marketplace-provider-config.service';
import { MarketplaceProviderConfigRepository } from '../marketplace-provider-config.repository';
import { MarketplaceProviderConfigValidator } from '../validator/marketplace-provider-config.validator';
import { MarketplaceProviderConfigCache } from '../cache/marketplace-provider-config.cache';
import { MarketplaceProviderConfigEventQueue } from '../jobs/marketplace-provider-config-events.queue';
import {
  ConfigurationEvent,
  ConfigurationScope,
  ConfigurationStatus,
} from '../interfaces';

const mockRepo = () => ({
  createConfig: jest.fn(),
  findConfigById: jest.fn(),
  findConfigs: jest.fn(),
  findActiveConfig: jest.fn(),
  updateConfig: jest.fn(),
  softDeleteConfig: jest.fn(),
  getNextVersion: jest.fn(),
  createHistory: jest.fn(),
  findHistory: jest.fn(),
  findHistoryByVersion: jest.fn(),
});

const mockValidator = () => ({
  validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
});

const mockCache = () => ({
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateByProvider: jest.fn(),
  invalidateByWorkspace: jest.fn(),
  flush: jest.fn(),
});

const mockQueue = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
});

function makeRawConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cfg-1',
    workspaceId: 'ws-1',
    scope: ConfigurationScope.WORKSPACE,
    providerKey: 'AMAZON_SP',
    accountId: null,
    name: 'Test Config',
    description: null,
    status: ConfigurationStatus.DRAFT,
    version: 1,
    publishedVersion: null,
    payload: { timeoutMs: 30_000 },
    createdBy: 'user-1',
    updatedBy: 'user-1',
    approvedBy: null,
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MarketplaceProviderConfigService', () => {
  let service: MarketplaceProviderConfigService;
  let repo: ReturnType<typeof mockRepo>;
  let validator: ReturnType<typeof mockValidator>;
  let cache: ReturnType<typeof mockCache>;
  let queue: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderConfigService,
        { provide: MarketplaceProviderConfigRepository, useFactory: mockRepo },
        { provide: MarketplaceProviderConfigValidator, useFactory: mockValidator },
        { provide: MarketplaceProviderConfigCache, useFactory: mockCache },
        { provide: MarketplaceProviderConfigEventQueue, useFactory: mockQueue },
      ],
    }).compile();

    service = module.get(MarketplaceProviderConfigService);
    repo = module.get(MarketplaceProviderConfigRepository) as unknown as ReturnType<typeof mockRepo>;
    validator = module.get(MarketplaceProviderConfigValidator) as unknown as ReturnType<typeof mockValidator>;
    cache = module.get(MarketplaceProviderConfigCache) as unknown as ReturnType<typeof mockCache>;
    queue = module.get(MarketplaceProviderConfigEventQueue) as unknown as ReturnType<typeof mockQueue>;
  });

  describe('createConfig()', () => {
    it('creates a config and emits CREATED event', async () => {
      const raw = makeRawConfig();
      repo.getNextVersion.mockResolvedValue(1);
      repo.createConfig.mockResolvedValue(raw);
      repo.createHistory.mockResolvedValue({});

      const result = await service.createConfig('ws-1', {
        providerKey: 'AMAZON_SP',
        name: 'Test Config',
        payload: { timeoutMs: 30_000 },
      }, 'user-1');

      expect(repo.createConfig).toHaveBeenCalledTimes(1);
      expect(repo.createHistory).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: ConfigurationEvent.CREATED }));
      expect(result.id).toBe('cfg-1');
    });

    it('throws BadRequestException when validation fails', async () => {
      validator.validate.mockReturnValue({ valid: false, errors: [{ field: 'timeoutMs', message: 'too low', code: 'INVALID_TIMEOUT' }], warnings: [] });

      await expect(
        service.createConfig('ws-1', { providerKey: 'AMAZON_SP', name: 'Test', payload: { timeoutMs: 100 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('returns config response dto', async () => {
      repo.findConfigById.mockResolvedValue(makeRawConfig());
      const result = await service.findById('cfg-1', 'ws-1');
      expect(result.id).toBe('cfg-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findConfigById.mockResolvedValue(null);
      await expect(service.findById('cfg-99', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig()', () => {
    it('merges payload and bumps version', async () => {
      const existing = makeRawConfig();
      const updated = makeRawConfig({ version: 2, payload: { timeoutMs: 60_000 } });
      repo.findConfigById.mockResolvedValue(existing);
      repo.updateConfig.mockResolvedValue(updated);
      repo.createHistory.mockResolvedValue({});

      const result = await service.updateConfig('cfg-1', 'ws-1', { payload: { timeoutMs: 60_000 } }, 'user-1');
      expect(repo.updateConfig).toHaveBeenCalledWith('cfg-1', expect.objectContaining({ version: 2 }));
      expect(cache.invalidate).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });

    it('throws BadRequest if config is ARCHIVED', async () => {
      repo.findConfigById.mockResolvedValue(makeRawConfig({ status: ConfigurationStatus.ARCHIVED }));
      await expect(service.updateConfig('cfg-1', 'ws-1', { name: 'New' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishConfig()', () => {
    it('transitions DRAFT → PUBLISHED and emits event', async () => {
      const existing = makeRawConfig({ status: ConfigurationStatus.DRAFT });
      const published = makeRawConfig({ status: ConfigurationStatus.PUBLISHED, publishedVersion: 1 });
      repo.findConfigById.mockResolvedValue(existing);
      repo.updateConfig.mockResolvedValue(published);
      repo.createHistory.mockResolvedValue({});

      const result = await service.publishConfig('cfg-1', 'ws-1', {}, 'user-1');
      expect(result.status).toBe(ConfigurationStatus.PUBLISHED);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: ConfigurationEvent.PUBLISHED }));
      expect(cache.invalidateByProvider).toHaveBeenCalled();
    });

    it('throws BadRequest when trying to publish an ARCHIVED config', async () => {
      repo.findConfigById.mockResolvedValue(makeRawConfig({ status: ConfigurationStatus.ARCHIVED }));
      await expect(service.publishConfig('cfg-1', 'ws-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('rollback()', () => {
    it('restores payload from history and increments version', async () => {
      const existing = makeRawConfig({ version: 3 });
      const historyEntry = { payload: { timeoutMs: 10_000 }, id: 'h-1', version: 1 };
      const updated = makeRawConfig({ version: 4, status: ConfigurationStatus.DRAFT, payload: { timeoutMs: 10_000 } });

      repo.findConfigById.mockResolvedValue(existing);
      repo.findHistoryByVersion.mockResolvedValue(historyEntry);
      repo.updateConfig.mockResolvedValue(updated);
      repo.createHistory.mockResolvedValue({});

      const result = await service.rollback('cfg-1', 'ws-1', { toVersion: 1 }, 'user-1');
      expect(repo.updateConfig).toHaveBeenCalledWith('cfg-1', expect.objectContaining({ version: 4, status: ConfigurationStatus.DRAFT }));
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: ConfigurationEvent.ROLLED_BACK }));
    });

    it('throws NotFoundException when history version does not exist', async () => {
      repo.findConfigById.mockResolvedValue(makeRawConfig());
      repo.findHistoryByVersion.mockResolvedValue(null);
      await expect(service.rollback('cfg-1', 'ws-1', { toVersion: 99 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('cloneConfig()', () => {
    it('creates a DRAFT clone with new name', async () => {
      const existing = makeRawConfig();
      const clone = makeRawConfig({ id: 'cfg-2', name: 'Clone of Test Config', version: 1 });
      repo.findConfigById.mockResolvedValue(existing);
      repo.getNextVersion.mockResolvedValue(1);
      repo.createConfig.mockResolvedValue(clone);
      repo.createHistory.mockResolvedValue({});

      const result = await service.cloneConfig('cfg-1', 'ws-1', { name: 'Clone of Test Config' }, 'user-1');
      expect(result.id).toBe('cfg-2');
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: ConfigurationEvent.CLONED }));
    });
  });

  describe('deleteConfig()', () => {
    it('soft-deletes and flushes cache', async () => {
      repo.findConfigById.mockResolvedValue(makeRawConfig());
      repo.softDeleteConfig.mockResolvedValue({});

      await service.deleteConfig('cfg-1', 'ws-1');
      expect(repo.softDeleteConfig).toHaveBeenCalledWith('cfg-1');
      expect(cache.flush).toHaveBeenCalled();
    });
  });

  describe('resolveActiveConfig()', () => {
    it('returns cached value when present', async () => {
      const cfg = { id: 'cfg-1' } as unknown as import('../interfaces').IMarketplaceProviderConfig;
      cache.get.mockReturnValue(cfg);

      const result = await service.resolveActiveConfig('AMAZON_SP', 'ws-1');
      expect(result).toBe(cfg);
      expect(repo.findActiveConfig).not.toHaveBeenCalled();
    });

    it('fetches from repo when cache misses and populates cache', async () => {
      cache.get.mockReturnValue(null);
      const raw = makeRawConfig({ status: ConfigurationStatus.PUBLISHED });
      repo.findActiveConfig.mockResolvedValue(raw);

      const result = await service.resolveActiveConfig('AMAZON_SP', 'ws-1');
      expect(repo.findActiveConfig).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('returns null when no active config exists', async () => {
      cache.get.mockReturnValue(null);
      repo.findActiveConfig.mockResolvedValue(null);

      const result = await service.resolveActiveConfig('AMAZON_SP', 'ws-1');
      expect(result).toBeNull();
    });
  });

  describe('workspace isolation', () => {
    it('cannot access config from another workspace', async () => {
      repo.findConfigById.mockResolvedValue(null); // returns null for wrong workspace
      await expect(service.findById('cfg-1', 'ws-other')).rejects.toThrow(NotFoundException);
    });
  });
});
