import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscoveryController } from '../discovery.controller';
import { DiscoveryService } from '../discovery.service';
import { DiscoveryMode, DiscoverySessionStatus } from '../interfaces';
import type { DiscoverySessionResponseDto } from '../dto';
import type { IDiscoverySessionListResult } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const SESSION_ID = 'session-uuid-1234';

const MOCK_SESSION_DTO: DiscoverySessionResponseDto = {
  id: SESSION_ID,
  workspaceId: WS_ID,
  marketplace: 'AMAZON',
  country: 'US',
  categories: ['Electronics'],
  keywords: ['wireless earbuds'],
  mode: DiscoveryMode.KEYWORD,
  status: DiscoverySessionStatus.PENDING,
  totalDiscovered: 0,
  newCandidates: 0,
  newOpportunities: 0,
  duplicatesSkipped: 0,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_LIST: IDiscoverySessionListResult = {
  items: [MOCK_SESSION_DTO as never],
  total: 1,
  page: 1,
  limit: 20,
};

// ── Test Suite ────────────────────────────────────────────────
describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let service: jest.Mocked<DiscoveryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        {
          provide: DiscoveryService,
          useValue: {
            createSession: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findResults: jest.fn(),
            cancelSession: jest.fn(),
            getStats: jest.fn(),
            getSupportedMarketplaces: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get(DiscoveryController);
    service = module.get(DiscoveryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createSession() ───────────────────────────────────────────
  describe('createSession()', () => {
    const dto = { marketplace: 'AMAZON', keywords: ['wireless earbuds'], country: 'US' };

    it('should return created session', async () => {
      service.createSession.mockResolvedValue(MOCK_SESSION_DTO);

      const result = await controller.createSession(dto as never, WS_ID);

      expect(result).toEqual(MOCK_SESSION_DTO);
      expect(service.createSession).toHaveBeenCalledWith(dto, WS_ID);
    });
  });

  // ── findAllSessions() ─────────────────────────────────────────
  describe('findAllSessions()', () => {
    it('should return paginated sessions', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST);
      const filter = { page: 1, limit: 20, skip: 0 };

      const result = await controller.findAllSessions(WS_ID, filter as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── findSessionById() ─────────────────────────────────────────
  describe('findSessionById()', () => {
    it('should return session by ID', async () => {
      service.findById.mockResolvedValue(MOCK_SESSION_DTO);

      const result = await controller.findSessionById(SESSION_ID, WS_ID);

      expect(result).toEqual(MOCK_SESSION_DTO);
      expect(service.findById).toHaveBeenCalledWith(SESSION_ID, WS_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findSessionById('bad-id', WS_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findSessionResults() ──────────────────────────────────────
  describe('findSessionResults()', () => {
    it('should return session results', async () => {
      service.findResults.mockResolvedValue([]);

      const result = await controller.findSessionResults(SESSION_ID, WS_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(service.findResults).toHaveBeenCalledWith(SESSION_ID, WS_ID);
    });
  });

  // ── cancelSession() ───────────────────────────────────────────
  describe('cancelSession()', () => {
    const cancelled = { ...MOCK_SESSION_DTO, status: DiscoverySessionStatus.CANCELLED };

    it('should return cancelled session', async () => {
      service.cancelSession.mockResolvedValue(cancelled);

      const result = await controller.cancelSession(SESSION_ID, WS_ID);

      expect(result.status).toBe(DiscoverySessionStatus.CANCELLED);
      expect(service.cancelSession).toHaveBeenCalledWith(SESSION_ID, WS_ID);
    });

    it('should propagate ConflictException', async () => {
      service.cancelSession.mockRejectedValue(new ConflictException('Already completed'));

      await expect(controller.cancelSession(SESSION_ID, WS_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ── getStats() ────────────────────────────────────────────────
  describe('getStats()', () => {
    it('should return discovery stats', async () => {
      const stats = {
        totalSessions: 3,
        runningSessions: 0,
        totalDiscovered: 30,
        totalNewCandidates: 20,
        totalNewOpportunities: 20,
        totalDuplicatesSkipped: 10,
        byMarketplace: { AMAZON: 3 },
        byStatus: { COMPLETED: 3 },
      };
      service.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(WS_ID);

      expect(result.totalSessions).toBe(3);
    });
  });

  // ── getSupportedMarketplaces() ────────────────────────────────
  describe('getSupportedMarketplaces()', () => {
    it('should return supported marketplace list', () => {
      service.getSupportedMarketplaces.mockReturnValue(['AMAZON']);

      const result = controller.getSupportedMarketplaces();

      expect(result).toContain('AMAZON');
    });
  });
});
