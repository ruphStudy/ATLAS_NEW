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

// ── In-memory fake repository ─────────────────────────────────

type RawRecord = Record<string, unknown>;

class FakeConfigRepository {
  private records: Map<string, RawRecord> = new Map();
  private history: RawRecord[] = [];
  private versionCounters: Map<string, number> = new Map();

  async createConfig(data: RawRecord): Promise<RawRecord> {
    const record = { id: `cfg-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.records.set(record['id'] as string, record);
    return record;
  }

  async findConfigById(id: string, _workspaceId: string): Promise<RawRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findConfigs(filter: RawRecord): Promise<[RawRecord[], number]> {
    const items = [...this.records.values()].filter((r) => !r['deletedAt']);
    return [items, items.length];
  }

  async findActiveConfig(
    providerKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    _marketplaceKey?: string | null,
  ): Promise<RawRecord | null> {
    return (
      [...this.records.values()].find(
        (r) =>
          r['providerKey'] === providerKey &&
          r['workspaceId'] === workspaceId &&
          r['status'] === ConfigurationStatus.PUBLISHED &&
          !r['deletedAt'],
      ) ?? null
    );
  }

  async updateConfig(id: string, data: RawRecord): Promise<RawRecord> {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Config ${id} not found`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async softDeleteConfig(id: string): Promise<void> {
    const existing = this.records.get(id);
    if (existing) this.records.set(id, { ...existing, deletedAt: new Date() });
  }

  async getNextVersion(providerKey: string, workspaceId?: string | null, _accountId?: string | null): Promise<number> {
    const key = `${providerKey}:${workspaceId ?? 'global'}`;
    const next = (this.versionCounters.get(key) ?? 0) + 1;
    this.versionCounters.set(key, next);
    return next;
  }

  async createHistory(data: RawRecord): Promise<RawRecord> {
    const entry = { id: `h-${Date.now()}`, ...data };
    this.history.push(entry);
    return entry;
  }

  async findHistory(configId: string): Promise<RawRecord[]> {
    return this.history.filter((h) => h['configId'] === configId);
  }

  async findHistoryByVersion(configId: string, version: number): Promise<RawRecord | null> {
    return this.history.find((h) => h['configId'] === configId && h['version'] === version) ?? null;
  }
}

// ── Fake queue ────────────────────────────────────────────────

class FakeQueue {
  readonly events: RawRecord[] = [];
  async enqueue(payload: RawRecord): Promise<void> {
    this.events.push(payload);
  }
}

// ── Tests ─────────────────────────────────────────────────────

describe('MarketplaceProviderConfigService — Integration', () => {
  let service: MarketplaceProviderConfigService;
  let fakeRepo: FakeConfigRepository;
  let fakeQueue: FakeQueue;
  let cache: MarketplaceProviderConfigCache;

  beforeEach(async () => {
    fakeRepo = new FakeConfigRepository();
    fakeQueue = new FakeQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderConfigService,
        { provide: MarketplaceProviderConfigRepository, useValue: fakeRepo },
        MarketplaceProviderConfigValidator,
        MarketplaceProviderConfigCache,
        { provide: MarketplaceProviderConfigEventQueue, useValue: fakeQueue },
      ],
    }).compile();

    service = module.get(MarketplaceProviderConfigService);
    cache = module.get(MarketplaceProviderConfigCache);
  });

  // ── Full lifecycle ────────────────────────────────────────

  it('create → publish → update → rollback pipeline', async () => {
    // Create
    const created = await service.createConfig(
      'ws-1',
      { providerKey: 'AMAZON_SP', name: 'Test', payload: { timeoutMs: 30_000 } },
      'user-1',
    );
    expect(created.status).toBe(ConfigurationStatus.DRAFT);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.CREATED)).toBe(true);

    // Publish
    const published = await service.publishConfig(created.id, 'ws-1', {}, 'user-1');
    expect(published.status).toBe(ConfigurationStatus.PUBLISHED);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.PUBLISHED)).toBe(true);

    // Update (creates new draft version)
    const updated = await service.updateConfig(created.id, 'ws-1', { payload: { timeoutMs: 60_000 } }, 'user-1');
    expect(updated.version).toBeGreaterThan(created.version);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.UPDATED)).toBe(true);

    // Rollback to original version
    const rolledBack = await service.rollback(
      created.id,
      'ws-1',
      { toVersion: created.version, reason: 'Revert' },
      'user-1',
    );
    expect(rolledBack.status).toBe(ConfigurationStatus.DRAFT);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.ROLLED_BACK)).toBe(true);
  });

  it('clone creates independent DRAFT copy', async () => {
    const original = await service.createConfig(
      'ws-1',
      { providerKey: 'FLIPKART', name: 'Original', payload: { timeoutMs: 20_000 } },
      'user-1',
    );

    const clone = await service.cloneConfig(original.id, 'ws-1', { name: 'Clone' }, 'user-1');
    expect(clone.id).not.toBe(original.id);
    expect(clone.name).toBe('Clone');
    expect(clone.status).toBe(ConfigurationStatus.DRAFT);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.CLONED)).toBe(true);
  });

  it('cache stores resolved config and serves it without DB call', async () => {
    const raw = await service.createConfig('ws-1', { providerKey: 'SHOPIFY', name: 'S', payload: {} }, 'u');
    // Manually publish in fake repo
    await fakeRepo.updateConfig(raw.id, { status: ConfigurationStatus.PUBLISHED });

    // First call: DB hit
    const resolved1 = await service.resolveActiveConfig('SHOPIFY', 'ws-1');
    expect(resolved1).not.toBeNull();

    // Second call: from cache (we spy to verify repo not called again)
    const repoSpy = jest.spyOn(fakeRepo, 'findActiveConfig');
    const resolved2 = await service.resolveActiveConfig('SHOPIFY', 'ws-1');
    expect(repoSpy).not.toHaveBeenCalled();
    expect(resolved2?.id).toBe(resolved1?.id);
  });

  it('workspace isolation: cannot read another workspace config', async () => {
    const cfg = await service.createConfig('ws-1', { providerKey: 'MEESHO', name: 'M', payload: {} }, 'u');
    await expect(service.findById(cfg.id, 'ws-other')).rejects.toThrow(NotFoundException);
  });

  it('disables then re-enables config via status transitions', async () => {
    const created = await service.createConfig('ws-1', { providerKey: 'EBAY', name: 'E', payload: {} }, 'u');
    const published = await service.publishConfig(created.id, 'ws-1', {});
    expect(published.status).toBe(ConfigurationStatus.PUBLISHED);

    const disabled = await service.disableConfig(created.id, 'ws-1');
    expect(disabled.status).toBe(ConfigurationStatus.DISABLED);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.DISABLED)).toBe(true);

    const enabled = await service.enableConfig(created.id, 'ws-1');
    expect(enabled.status).toBe(ConfigurationStatus.PUBLISHED);
    expect(fakeQueue.events.some((e) => e['event'] === ConfigurationEvent.ENABLED)).toBe(true);
  });

  it('archiving prevents further mutation', async () => {
    const created = await service.createConfig('ws-1', { providerKey: 'WALMART', name: 'W', payload: {} }, 'u');
    const published = await service.publishConfig(created.id, 'ws-1', {});
    await service.archiveConfig(published.id, 'ws-1');

    await expect(
      service.updateConfig(published.id, 'ws-1', { name: 'New Name' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('import then export round-trip preserves payload', async () => {
    const imported = await service.importConfig(
      'ws-1',
      { providerKey: 'CUSTOM', name: 'Custom Import', payload: { timeoutMs: 45_000 } },
      'u',
    );
    expect(imported.payload.timeoutMs).toBe(45_000);

    const exported = service.exportConfig(imported);
    expect(exported['providerKey']).toBe('CUSTOM');
    expect((exported['payload'] as Record<string, unknown>)['timeoutMs']).toBe(45_000);
  });

  it('getHistory returns all snapshots for a config', async () => {
    const created = await service.createConfig('ws-1', { providerKey: 'AMAZON_SP', name: 'H', payload: {} }, 'u');
    await service.updateConfig(created.id, 'ws-1', { name: 'H Updated' }, 'u');
    await service.updateConfig(created.id, 'ws-1', { name: 'H Updated 2' }, 'u');

    const history = await service.getHistory(created.id, 'ws-1');
    expect(history.length).toBeGreaterThanOrEqual(3); // create + 2 updates
  });

  it('findAll returns paginated results', async () => {
    await service.createConfig('ws-2', { providerKey: 'AMAZON_SP', name: 'A1', payload: {} }, 'u');
    await service.createConfig('ws-2', { providerKey: 'AMAZON_SP', name: 'A2', payload: {} }, 'u');

    const result = await service.findAll('ws-2', { page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });
});
