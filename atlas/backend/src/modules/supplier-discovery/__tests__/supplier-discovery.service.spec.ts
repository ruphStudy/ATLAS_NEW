import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierDiscoveryService } from '../supplier-discovery.service';
import { SupplierDiscoveryRepository } from '../supplier-discovery.repository';
import { SupplierDiscoveryQueue } from '../jobs/supplier-discovery.queue';
import { SupplierProviderRegistry } from '../providers/provider.registry';
import {
  SupplierDiscoverySessionStatus,
  SupplierSourceProvider,
  SupplierStatus,
  SupplierTier,
} from '../interfaces';

const WS_ID = 'workspace-uuid';
const SUPPLIER_ID = 'supplier-uuid';
const SESSION_ID = 'session-uuid';

function buildSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: SUPPLIER_ID,
    workspaceId: WS_ID,
    name: 'Acme Electronics',
    provider: SupplierSourceProvider.MANUAL,
    providerSupplierId: null,
    country: 'IN',
    city: 'Mumbai',
    website: null,
    contactEmail: null,
    contactPhone: null,
    tier: SupplierTier.UNVERIFIED,
    status: SupplierStatus.PENDING_REVIEW,
    categories: [],
    minOrderQuantity: null,
    avgLeadTimeDays: null,
    overallRating: null,
    notes: null,
    rawData: {},
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    workspaceId: WS_ID,
    provider: SupplierSourceProvider.INDIAMART,
    keyword: 'wireless earbuds',
    country: 'IN',
    category: null,
    status: SupplierDiscoverySessionStatus.PENDING,
    totalDiscovered: 0,
    newSuppliers: 0,
    duplicatesSkipped: 0,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    ...overrides,
  };
}

describe('SupplierDiscoveryService', () => {
  let service: SupplierDiscoveryService;
  let repo: jest.Mocked<SupplierDiscoveryRepository>;
  let queue: jest.Mocked<SupplierDiscoveryQueue>;
  let registry: jest.Mocked<SupplierProviderRegistry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierDiscoveryService,
        {
          provide: SupplierDiscoveryRepository,
          useValue: {
            createSupplier: jest.fn(),
            findSupplierById: jest.fn(),
            findAllSuppliers: jest.fn(),
            updateSupplier: jest.fn(),
            softDeleteSupplier: jest.fn().mockResolvedValue(undefined),
            findDuplicateSupplier: jest.fn(),
            linkToOpportunity: jest.fn(),
            unlinkFromOpportunity: jest.fn().mockResolvedValue(undefined),
            getOpportunitySuppliers: jest.fn(),
            createSession: jest.fn(),
            findSessionById: jest.fn(),
            findAllSessions: jest.fn(),
            updateSession: jest.fn(),
            findSessionResults: jest.fn(),
            getStats: jest.fn(),
          },
        },
        { provide: SupplierDiscoveryQueue, useValue: { enqueue: jest.fn().mockResolvedValue('job-id') } },
        {
          provide: SupplierProviderRegistry,
          useValue: {
            isSupported: jest.fn().mockReturnValue(true),
            getSupportedProviders: jest.fn().mockReturnValue(['INDIAMART', 'TRADEINDIA', 'ALIBABA']),
          },
        },
      ],
    }).compile();

    service = module.get(SupplierDiscoveryService);
    repo = module.get(SupplierDiscoveryRepository);
    queue = module.get(SupplierDiscoveryQueue);
    registry = module.get(SupplierProviderRegistry);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createSupplier()', () => {
    it('should create and return supplier DTO', async () => {
      repo.createSupplier.mockResolvedValue(buildSupplier() as never);
      const result = await service.createSupplier({ name: 'Acme Electronics' }, WS_ID);
      expect(result.id).toBe(SUPPLIER_ID);
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('should set workspaceId from parameter', async () => {
      repo.createSupplier.mockResolvedValue(buildSupplier() as never);
      await service.createSupplier({ name: 'Acme' }, WS_ID);
      expect(repo.createSupplier).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS_ID }));
    });
  });

  describe('findAllSuppliers()', () => {
    it('should return paginated list', async () => {
      repo.findAllSuppliers.mockResolvedValue([[buildSupplier() as never], 1]);
      const result = await service.findAllSuppliers(WS_ID, { page: 1, limit: 20, skip: 0 } as never);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findSupplierById()', () => {
    it('should return supplier by ID', async () => {
      repo.findSupplierById.mockResolvedValue(buildSupplier() as never);
      const result = await service.findSupplierById(SUPPLIER_ID, WS_ID);
      expect(result.id).toBe(SUPPLIER_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findSupplierById.mockResolvedValue(null);
      await expect(service.findSupplierById('bad', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSupplier()', () => {
    it('should update and return supplier', async () => {
      repo.findSupplierById.mockResolvedValue(buildSupplier() as never);
      const updated = buildSupplier({ name: 'Updated Name' });
      repo.updateSupplier.mockResolvedValue(updated as never);
      const result = await service.updateSupplier(SUPPLIER_ID, { name: 'Updated Name' }, WS_ID);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when supplier not found', async () => {
      repo.findSupplierById.mockResolvedValue(null);
      await expect(service.updateSupplier('bad', { name: 'x' }, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSupplier()', () => {
    it('should soft-delete the supplier', async () => {
      repo.findSupplierById.mockResolvedValue(buildSupplier() as never);
      await expect(service.removeSupplier(SUPPLIER_ID, WS_ID)).resolves.toBeUndefined();
      expect(repo.softDeleteSupplier).toHaveBeenCalledWith(SUPPLIER_ID);
    });
  });

  describe('createSession()', () => {
    const dto = { provider: SupplierSourceProvider.INDIAMART, keyword: 'wireless earbuds', country: 'IN' };

    it('should create session and enqueue job', async () => {
      repo.createSession.mockResolvedValue(buildSession() as never);
      const result = await service.createSession(dto, WS_ID);
      expect(result.id).toBe(SESSION_ID);
      expect(queue.enqueue).toHaveBeenCalledWith({ sessionId: SESSION_ID, workspaceId: WS_ID });
    });

    it('should throw NotFoundException for unsupported provider', async () => {
      registry.isSupported.mockReturnValue(false);
      await expect(service.createSession({ ...dto, provider: 'UNKNOWN' as never }, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSession()', () => {
    it('should cancel PENDING session', async () => {
      repo.findSessionById.mockResolvedValue(buildSession() as never);
      const cancelled = buildSession({ status: SupplierDiscoverySessionStatus.CANCELLED });
      repo.updateSession.mockResolvedValue(cancelled as never);
      const result = await service.cancelSession(SESSION_ID, WS_ID);
      expect(result.status).toBe(SupplierDiscoverySessionStatus.CANCELLED);
    });

    it('should throw ConflictException when already COMPLETED', async () => {
      repo.findSessionById.mockResolvedValue(buildSession({ status: SupplierDiscoverySessionStatus.COMPLETED }) as never);
      await expect(service.cancelSession(SESSION_ID, WS_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('getStats()', () => {
    it('should return stats', async () => {
      repo.getStats.mockResolvedValue({
        totalSessions: 5, runningSessions: 1, totalSuppliers: 20,
        totalNewSuppliers: 15, totalDuplicatesSkipped: 5,
        byProvider: { INDIAMART: 3 }, byStatus: { COMPLETED: 4 }, byTier: { UNVERIFIED: 20 },
      });
      const result = await service.getStats(WS_ID);
      expect(result.totalSessions).toBe(5);
    });
  });
});
