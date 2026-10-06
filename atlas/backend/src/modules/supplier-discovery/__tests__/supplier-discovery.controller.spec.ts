import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { SuppliersController, SupplierDiscoveryController } from '../supplier-discovery.controller';
import { SupplierDiscoveryService } from '../supplier-discovery.service';
import { SupplierDiscoverySessionStatus, SupplierSourceProvider, SupplierStatus, SupplierTier } from '../interfaces';
import type { SupplierResponseDto, SupplierDiscoverySessionResponseDto } from '../dto';
import type { ISupplier } from '../interfaces';

const WS_ID = 'workspace-uuid';
const SUPPLIER_ID = 'supplier-uuid';
const SESSION_ID = 'session-uuid';

const MOCK_SUPPLIER: SupplierResponseDto = {
  id: SUPPLIER_ID, workspaceId: WS_ID, name: 'Acme Electronics',
  provider: SupplierSourceProvider.MANUAL, providerSupplierId: null,
  country: 'IN', city: 'Mumbai', website: null, contactEmail: null, contactPhone: null,
  tier: SupplierTier.UNVERIFIED, status: SupplierStatus.PENDING_REVIEW,
  categories: [], minOrderQuantity: null, avgLeadTimeDays: null, overallRating: null, notes: null,
  createdAt: '2026-07-14T10:00:00.000Z', updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_SUPPLIER_RAW: ISupplier = {
  id: SUPPLIER_ID, workspaceId: WS_ID, name: 'Acme Electronics',
  provider: SupplierSourceProvider.MANUAL, providerSupplierId: null,
  country: 'IN', city: 'Mumbai', website: null, contactEmail: null, contactPhone: null,
  tier: SupplierTier.UNVERIFIED, status: SupplierStatus.PENDING_REVIEW,
  categories: [], minOrderQuantity: null, avgLeadTimeDays: null, overallRating: null, notes: null,
  rawData: {},
  createdAt: new Date('2026-07-14T10:00:00.000Z'), updatedAt: new Date('2026-07-14T10:00:00.000Z'),
  deletedAt: null,
};

const MOCK_SESSION: SupplierDiscoverySessionResponseDto = {
  id: SESSION_ID, workspaceId: WS_ID, provider: SupplierSourceProvider.INDIAMART,
  keyword: 'wireless earbuds', country: 'IN', category: null,
  status: SupplierDiscoverySessionStatus.PENDING, totalDiscovered: 0, newSuppliers: 0,
  duplicatesSkipped: 0, errorMessage: null, startedAt: null, completedAt: null,
  createdAt: '2026-07-14T10:00:00.000Z', updatedAt: '2026-07-14T10:00:00.000Z',
};

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: jest.Mocked<SupplierDiscoveryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SupplierDiscoveryService, useValue: {
        createSupplier: jest.fn(), findAllSuppliers: jest.fn(), findSupplierById: jest.fn(),
        updateSupplier: jest.fn(), removeSupplier: jest.fn(), linkToOpportunity: jest.fn(),
        unlinkFromOpportunity: jest.fn(), getOpportunitySuppliers: jest.fn(),
      }}],
    }).setLogger(new Logger()).compile();
    controller = module.get(SuppliersController);
    service = module.get(SupplierDiscoveryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create() should return supplier', async () => {
    service.createSupplier.mockResolvedValue(MOCK_SUPPLIER);
    const result = await controller.create({ name: 'Acme Electronics' } as never, WS_ID);
    expect(result).toEqual(MOCK_SUPPLIER);
    expect(service.createSupplier).toHaveBeenCalledWith({ name: 'Acme Electronics' }, WS_ID);
  });

  it('findAll() should return paginated list', async () => {
    service.findAllSuppliers.mockResolvedValue({ items: [MOCK_SUPPLIER_RAW], total: 1, page: 1, limit: 20 });
    const result = await controller.findAll(WS_ID, { page: 1, limit: 20, skip: 0 } as never);
    expect(result.total).toBe(1);
  });

  it('findById() should return supplier', async () => {
    service.findSupplierById.mockResolvedValue(MOCK_SUPPLIER);
    expect(await controller.findById(SUPPLIER_ID, WS_ID)).toEqual(MOCK_SUPPLIER);
  });

  it('findById() should propagate NotFoundException', async () => {
    service.findSupplierById.mockRejectedValue(new NotFoundException());
    await expect(controller.findById('bad', WS_ID)).rejects.toThrow(NotFoundException);
  });

  it('update() should return updated supplier', async () => {
    service.updateSupplier.mockResolvedValue({ ...MOCK_SUPPLIER, name: 'Updated' });
    const result = await controller.update(SUPPLIER_ID, { name: 'Updated' } as never, WS_ID);
    expect(result.name).toBe('Updated');
  });

  it('remove() should resolve to undefined', async () => {
    service.removeSupplier.mockResolvedValue(undefined);
    expect(await controller.remove(SUPPLIER_ID, WS_ID)).toBeUndefined();
  });
});

describe('SupplierDiscoveryController', () => {
  let controller: SupplierDiscoveryController;
  let service: jest.Mocked<SupplierDiscoveryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierDiscoveryController],
      providers: [{ provide: SupplierDiscoveryService, useValue: {
        createSession: jest.fn(), findAllSessions: jest.fn(), findSessionById: jest.fn(),
        findSessionResults: jest.fn(), cancelSession: jest.fn(),
        getStats: jest.fn(), getSupportedProviders: jest.fn(),
      }}],
    }).setLogger(new Logger()).compile();
    controller = module.get(SupplierDiscoveryController);
    service = module.get(SupplierDiscoveryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('createSession() should return session', async () => {
    service.createSession.mockResolvedValue(MOCK_SESSION);
    const dto = { provider: SupplierSourceProvider.INDIAMART, keyword: 'wireless earbuds' };
    const result = await controller.createSession(dto as never, WS_ID);
    expect(result).toEqual(MOCK_SESSION);
    expect(service.createSession).toHaveBeenCalledWith(dto, WS_ID);
  });

  it('findAllSessions() should return list', async () => {
    service.findAllSessions.mockResolvedValue({ items: [MOCK_SESSION as never], total: 1, page: 1, limit: 20 });
    const result = await controller.findAllSessions(WS_ID, { page: 1, limit: 20, skip: 0 } as never);
    expect(result.total).toBe(1);
  });

  it('findSessionById() should return session', async () => {
    service.findSessionById.mockResolvedValue(MOCK_SESSION);
    expect(await controller.findSessionById(SESSION_ID, WS_ID)).toEqual(MOCK_SESSION);
  });

  it('cancelSession() should return cancelled session', async () => {
    const cancelled = { ...MOCK_SESSION, status: SupplierDiscoverySessionStatus.CANCELLED };
    service.cancelSession.mockResolvedValue(cancelled);
    const result = await controller.cancelSession(SESSION_ID, WS_ID);
    expect(result.status).toBe(SupplierDiscoverySessionStatus.CANCELLED);
  });

  it('cancelSession() should propagate ConflictException', async () => {
    service.cancelSession.mockRejectedValue(new ConflictException('Already completed'));
    await expect(controller.cancelSession(SESSION_ID, WS_ID)).rejects.toThrow(ConflictException);
  });

  it('getSupportedProviders() should return list', () => {
    service.getSupportedProviders.mockReturnValue(['INDIAMART', 'TRADEINDIA', 'ALIBABA']);
    expect(controller.getSupportedProviders()).toEqual(['INDIAMART', 'TRADEINDIA', 'ALIBABA']);
  });
});
