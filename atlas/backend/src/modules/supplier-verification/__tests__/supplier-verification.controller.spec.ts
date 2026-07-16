import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { SupplierVerificationController } from '../supplier-verification.controller';
import { SupplierVerificationService } from '../supplier-verification.service';
import { VerificationStatus, getDefaultVerificationRules } from '../interfaces';
import type { VerificationResponseDto, VerificationWithChecksResponseDto } from '../dto';

const WS_ID = 'workspace-uuid';
const SUPPLIER_ID = 'supplier-uuid';
const VERIFICATION_ID = 'verification-uuid';
const REQUESTER_PAYLOAD = { sub: 'user-uuid', email: 'admin@acme.com', workspaceId: WS_ID, role: 'OWNER', type: 'access' as const };

const MOCK_VERIFICATION: VerificationResponseDto = {
  id: VERIFICATION_ID, workspaceId: WS_ID, supplierId: SUPPLIER_ID,
  status: VerificationStatus.PENDING, score: null, scoreThreshold: 70, isLatest: true,
  overrideNotes: null, overriddenBy: null, overriddenAt: null, completedAt: null,
  createdAt: '2026-07-14T10:00:00.000Z', updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_WITH_CHECKS: VerificationWithChecksResponseDto = { ...MOCK_VERIFICATION, checkResults: [] };

describe('SupplierVerificationController', () => {
  let controller: SupplierVerificationController;
  let service: jest.Mocked<SupplierVerificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierVerificationController],
      providers: [{
        provide: SupplierVerificationService,
        useValue: {
          startVerification: jest.fn(),
          findAll: jest.fn(),
          findById: jest.fn(),
          findLatestForSupplier: jest.fn(),
          manualOverride: jest.fn(),
          getRules: jest.fn(),
          configureRules: jest.fn(),
        },
      }],
    }).setLogger(new Logger()).compile();

    controller = module.get(SupplierVerificationController);
    service = module.get(SupplierVerificationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('startVerification() should return created verification', async () => {
    service.startVerification.mockResolvedValue(MOCK_VERIFICATION);
    const result = await controller.startVerification(SUPPLIER_ID, {}, WS_ID);
    expect(result).toEqual(MOCK_VERIFICATION);
    expect(service.startVerification).toHaveBeenCalledWith(SUPPLIER_ID, WS_ID, {});
  });

  it('startVerification() should propagate ConflictException', async () => {
    service.startVerification.mockRejectedValue(new ConflictException('Already pending'));
    await expect(controller.startVerification(SUPPLIER_ID, {}, WS_ID)).rejects.toThrow(ConflictException);
  });

  it('findAll() should return paginated list', async () => {
    service.findAll.mockResolvedValue({ items: [MOCK_VERIFICATION as never], total: 1, page: 1, limit: 20 });
    const result = await controller.findAll(WS_ID, { page: 1, limit: 20, skip: 0 } as never);
    expect(result.total).toBe(1);
  });

  it('findById() should return verification with checks', async () => {
    service.findById.mockResolvedValue(MOCK_WITH_CHECKS);
    const result = await controller.findById(VERIFICATION_ID, WS_ID);
    expect(result.checkResults).toBeDefined();
    expect(service.findById).toHaveBeenCalledWith(VERIFICATION_ID, WS_ID);
  });

  it('findById() should propagate NotFoundException', async () => {
    service.findById.mockRejectedValue(new NotFoundException());
    await expect(controller.findById('bad', WS_ID)).rejects.toThrow(NotFoundException);
  });

  it('findLatestForSupplier() should return latest verification', async () => {
    service.findLatestForSupplier.mockResolvedValue(MOCK_WITH_CHECKS);
    const result = await controller.findLatestForSupplier(SUPPLIER_ID, WS_ID);
    expect(result.supplierId).toBe(SUPPLIER_ID);
  });

  it('manualOverride() should return updated verification', async () => {
    const overridden = { ...MOCK_WITH_CHECKS, status: VerificationStatus.VERIFIED };
    service.manualOverride.mockResolvedValue(overridden);
    const dto = { status: VerificationStatus.VERIFIED, reason: 'Manually verified' };
    const result = await controller.manualOverride(VERIFICATION_ID, dto, REQUESTER_PAYLOAD);
    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(service.manualOverride).toHaveBeenCalledWith(VERIFICATION_ID, WS_ID, dto, 'user-uuid');
  });

  it('getRules() should return current rules', async () => {
    const rules = getDefaultVerificationRules();
    service.getRules.mockResolvedValue(rules);
    const result = await controller.getRules(WS_ID);
    expect(result.scoreThreshold).toBe(70);
  });

  it('configureRules() should return merged rules', async () => {
    const rules = { ...getDefaultVerificationRules(), scoreThreshold: 80 };
    service.configureRules.mockResolvedValue(rules);
    const result = await controller.configureRules({ scoreThreshold: 80 }, WS_ID);
    expect(result.scoreThreshold).toBe(80);
  });
});
