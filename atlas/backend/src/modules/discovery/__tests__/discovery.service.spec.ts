import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DiscoveryService } from '../discovery.service';
import { DiscoveryRepository } from '../discovery.repository';
import { DiscoveryQueue } from '../jobs/discovery.queue';
import { MarketplaceAdapterRegistry } from '../adapters/adapter.registry';
import { DiscoverySessionStatus } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const SESSION_ID = 'session-uuid-1234';

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    workspaceId: WS_ID,
    marketplace: 'AMAZON',
    country: 'US',
    categories: ['Electronics'],
    keywords: ['wireless earbuds', 'bluetooth speaker'],
    status: DiscoverySessionStatus.PENDING,
    totalDiscovered: 0,
    newCandidates: 0,
    newOpportunities: 0,
    duplicatesSkipped: 0,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    ...overrides,
  };
}

const MOCK_SESSION = buildSession();

// ── Test Suite ────────────────────────────────────────────────
describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let repo: jest.Mocked<DiscoveryRepository>;
  let queue: jest.Mocked<DiscoveryQueue>;
  let registry: jest.Mocked<MarketplaceAdapterRegistry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: DiscoveryRepository,
          useValue: {
            createSession: jest.fn(),
            findSessionById: jest.fn(),
            findAllSessions: jest.fn(),
            updateSession: jest.fn(),
            findSessionResults: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: DiscoveryQueue,
          useValue: {
            enqueue: jest.fn().mockResolvedValue('job-id'),
          },
        },
        {
          provide: MarketplaceAdapterRegistry,
          useValue: {
            isSupported: jest.fn().mockReturnValue(true),
            getSupportedMarketplaces: jest.fn().mockReturnValue(['AMAZON']),
          },
        },
      ],
    }).compile();

    service = module.get(DiscoveryService);
    repo = module.get(DiscoveryRepository);
    queue = module.get(DiscoveryQueue);
    registry = module.get(MarketplaceAdapterRegistry);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createSession() ───────────────────────────────────────────
  describe('createSession()', () => {
    const dto = {
      marketplace: 'AMAZON',
      country: 'US',
      keywords: ['wireless earbuds', 'bluetooth speaker'],
      categories: ['Electronics'],
    };

    it('should create session and enqueue job', async () => {
      repo.createSession.mockResolvedValue(MOCK_SESSION as never);

      const result = await service.createSession(dto, WS_ID);

      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ marketplace: 'AMAZON', workspaceId: WS_ID }),
      );
      expect(queue.enqueue).toHaveBeenCalledWith({ sessionId: SESSION_ID, workspaceId: WS_ID });
      expect(result.id).toBe(SESSION_ID);
    });

    it('should throw BadRequestException for unsupported marketplace', async () => {
      registry.isSupported.mockReturnValue(false);

      await expect(service.createSession({ ...dto, marketplace: 'UNKNOWN' }, WS_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.createSession).not.toHaveBeenCalled();
    });

    it('should still create a session when mode is omitted (KEYWORD mode unchanged)', async () => {
      repo.createSession.mockResolvedValue(MOCK_SESSION as never);

      await service.createSession(dto, WS_ID);

      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'KEYWORD' }),
      );
    });

    it('should still create a session when mode is explicitly KEYWORD', async () => {
      repo.createSession.mockResolvedValue(MOCK_SESSION as never);

      await service.createSession({ ...dto, mode: 'KEYWORD' as never }, WS_ID);

      expect(repo.createSession).toHaveBeenCalled();
    });

    it('should reject ASIN mode with BadRequestException instead of running an empty session', async () => {
      await expect(
        service.createSession({ ...dto, mode: 'ASIN' as never }, WS_ID),
      ).rejects.toThrow(BadRequestException);
      expect(repo.createSession).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should still reject ASIN mode with BadRequestException instead of running an empty session', async () => {
      await expect(
        service.createSession({ ...dto, mode: 'ASIN' as never }, WS_ID),
      ).rejects.toThrow(BadRequestException);
      expect(repo.createSession).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should accept TREND_COLD_START mode without requiring marketplace/country/keywords (Prompt 6)', async () => {
      repo.createSession.mockResolvedValue(buildSession({ mode: 'TREND_COLD_START' }) as never);

      await service.createSession({ mode: 'TREND_COLD_START' } as never, WS_ID);

      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WS_ID, mode: 'TREND_COLD_START' }),
      );
      expect(queue.enqueue).toHaveBeenCalled();
      expect(registry.isSupported).not.toHaveBeenCalled();
    });

    it('should uppercase the marketplace code', async () => {
      repo.createSession.mockResolvedValue(MOCK_SESSION as never);
      await service.createSession({ ...dto, marketplace: 'amazon' }, WS_ID);
      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ marketplace: 'AMAZON' }),
      );
    });

    it('should default country to US when not provided', async () => {
      const { country: _c, ...withoutCountry } = dto;
      repo.createSession.mockResolvedValue(MOCK_SESSION as never);
      await service.createSession(withoutCountry, WS_ID);
      expect(repo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'US' }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated sessions', async () => {
      repo.findAllSessions.mockResolvedValue([[MOCK_SESSION as never], 1]);
      const filter = { page: 1, limit: 20, skip: 0 };

      const result = await service.findAll(WS_ID, filter as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return session DTO', async () => {
      repo.findSessionById.mockResolvedValue(MOCK_SESSION as never);

      const result = await service.findById(SESSION_ID, WS_ID);

      expect(result.id).toBe(SESSION_ID);
      expect(result.marketplace).toBe('AMAZON');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findSessionById.mockResolvedValue(null);

      await expect(service.findById('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancelSession() ───────────────────────────────────────────
  describe('cancelSession()', () => {
    it('should cancel a PENDING session', async () => {
      repo.findSessionById.mockResolvedValue(MOCK_SESSION as never);
      const cancelled = buildSession({ status: DiscoverySessionStatus.CANCELLED });
      repo.updateSession.mockResolvedValue(cancelled as never);

      const result = await service.cancelSession(SESSION_ID, WS_ID);

      expect(result.status).toBe(DiscoverySessionStatus.CANCELLED);
      expect(repo.updateSession).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ status: 'CANCELLED' }),
      );
    });

    it('should cancel a RUNNING session', async () => {
      const running = buildSession({ status: DiscoverySessionStatus.RUNNING });
      repo.findSessionById.mockResolvedValue(running as never);
      const cancelled = buildSession({ status: DiscoverySessionStatus.CANCELLED });
      repo.updateSession.mockResolvedValue(cancelled as never);

      await expect(service.cancelSession(SESSION_ID, WS_ID)).resolves.toBeDefined();
    });

    it('should throw ConflictException when session is already COMPLETED', async () => {
      const completed = buildSession({ status: DiscoverySessionStatus.COMPLETED });
      repo.findSessionById.mockResolvedValue(completed as never);

      await expect(service.cancelSession(SESSION_ID, WS_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when session is already CANCELLED', async () => {
      const cancelled = buildSession({ status: DiscoverySessionStatus.CANCELLED });
      repo.findSessionById.mockResolvedValue(cancelled as never);

      await expect(service.cancelSession(SESSION_ID, WS_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      repo.findSessionById.mockResolvedValue(null);

      await expect(service.cancelSession('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStats() ────────────────────────────────────────────────
  describe('getStats()', () => {
    it('should return discovery stats', async () => {
      const stats = {
        totalSessions: 5,
        runningSessions: 1,
        totalDiscovered: 50,
        totalNewCandidates: 30,
        totalNewOpportunities: 30,
        totalDuplicatesSkipped: 20,
        byMarketplace: { AMAZON: 5 },
        byStatus: { COMPLETED: 4, RUNNING: 1 },
      };
      repo.getStats.mockResolvedValue(stats);

      const result = await service.getStats(WS_ID);

      expect(result.totalSessions).toBe(5);
      expect(result.totalNewCandidates).toBe(30);
    });
  });

  // ── getSupportedMarketplaces() ────────────────────────────────
  describe('getSupportedMarketplaces()', () => {
    it('should return list from registry', () => {
      const result = service.getSupportedMarketplaces();
      expect(result).toEqual(['AMAZON']);
    });
  });
});
