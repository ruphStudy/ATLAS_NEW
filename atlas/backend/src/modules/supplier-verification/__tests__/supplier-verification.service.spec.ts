import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierVerificationService } from '../supplier-verification.service';
import { SupplierVerificationRepository } from '../supplier-verification.repository';
import { VerificationQueue } from '../jobs/verification.queue';
import { VerificationStatus, VerificationCheckStatus, getDefaultVerificationRules } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const SUPPLIER_ID = 'supplier-uuid';
const VERIFICATION_ID = 'verification-uuid';
const USER_ID = 'user-uuid';

function buildVerification(overrides: Record<string, unknown> = {}) {
  return {
    id: VERIFICATION_ID,
    workspaceId: WS_ID,
    supplierId: SUPPLIER_ID,
    status: VerificationStatus.PENDING,
    score: null,
    scoreThreshold: 70,
    isLatest: true,
    overrideNotes: null,
    overriddenBy: null,
    overriddenAt: null,
    completedAt: null,
    rulesSnapshot: getDefaultVerificationRules(),
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    ...overrides,
  };
}

function buildVerificationWithChecks(overrides: Record<string, unknown> = {}) {
  return {
    ...buildVerification(overrides),
    checkResults: [],
  };
}

describe('SupplierVerificationService', () => {
  let service: SupplierVerificationService;
  let repo: jest.Mocked<SupplierVerificationRepository>;
  let queue: jest.Mocked<VerificationQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierVerificationService,
        {
          provide: SupplierVerificationRepository,
          useValue: {
            hasPendingVerification: jest.fn().mockResolvedValue(false),
            markPreviousAsNotLatest: jest.fn().mockResolvedValue(undefined),
            createVerification: jest.fn(),
            findVerificationById: jest.fn(),
            findVerificationWithChecks: jest.fn(),
            findLatestForSupplier: jest.fn(),
            findAllVerifications: jest.fn(),
            updateVerification: jest.fn(),
            findCheckResultsByVerification: jest.fn().mockResolvedValue([]),
            updateCheckResult: jest.fn(),
            getRuleConfig: jest.fn().mockResolvedValue(null),
            upsertRuleConfig: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VerificationQueue,
          useValue: { enqueue: jest.fn().mockResolvedValue('job-id') },
        },
      ],
    }).compile();

    service = module.get(SupplierVerificationService);
    repo = module.get(SupplierVerificationRepository);
    queue = module.get(VerificationQueue);
  });

  afterEach(() => jest.clearAllMocks());

  // ── startVerification() ───────────────────────────────────────
  describe('startVerification()', () => {
    it('should create verification and enqueue job', async () => {
      repo.createVerification.mockResolvedValue(buildVerification() as never);
      const result = await service.startVerification(SUPPLIER_ID, WS_ID, {});
      expect(result.id).toBe(VERIFICATION_ID);
      expect(queue.enqueue).toHaveBeenCalledWith({
        verificationId: VERIFICATION_ID, supplierId: SUPPLIER_ID, workspaceId: WS_ID,
      });
    });

    it('should throw ConflictException when pending verification exists', async () => {
      repo.hasPendingVerification.mockResolvedValue(true);
      await expect(service.startVerification(SUPPLIER_ID, WS_ID, {})).rejects.toThrow(ConflictException);
      expect(repo.createVerification).not.toHaveBeenCalled();
    });

    it('should mark previous verifications as not latest', async () => {
      repo.createVerification.mockResolvedValue(buildVerification() as never);
      await service.startVerification(SUPPLIER_ID, WS_ID, {});
      expect(repo.markPreviousAsNotLatest).toHaveBeenCalledWith(SUPPLIER_ID, WS_ID);
    });

    it('should use default rules when no workspace rules configured', async () => {
      repo.getRuleConfig.mockResolvedValue(null);
      repo.createVerification.mockResolvedValue(buildVerification() as never);
      await service.startVerification(SUPPLIER_ID, WS_ID, {});
      expect(repo.createVerification).toHaveBeenCalledWith(
        expect.objectContaining({ rulesSnapshot: expect.objectContaining({ scoreThreshold: 70 }) }),
      );
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return verification with check results', async () => {
      repo.findVerificationWithChecks.mockResolvedValue(buildVerificationWithChecks() as never);
      const result = await service.findById(VERIFICATION_ID, WS_ID);
      expect(result.id).toBe(VERIFICATION_ID);
      expect(Array.isArray(result.checkResults)).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findVerificationWithChecks.mockResolvedValue(null);
      await expect(service.findById('bad', WS_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      repo.findVerificationWithChecks.mockResolvedValue({
        ...buildVerificationWithChecks(), workspaceId: 'other-workspace',
      } as never);
      await expect(service.findById(VERIFICATION_ID, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findLatestForSupplier() ───────────────────────────────────
  describe('findLatestForSupplier()', () => {
    it('should return latest verification', async () => {
      repo.findLatestForSupplier.mockResolvedValue(buildVerificationWithChecks() as never);
      const result = await service.findLatestForSupplier(SUPPLIER_ID, WS_ID);
      expect(result.supplierId).toBe(SUPPLIER_ID);
    });

    it('should throw NotFoundException when no verification exists', async () => {
      repo.findLatestForSupplier.mockResolvedValue(null);
      await expect(service.findLatestForSupplier(SUPPLIER_ID, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── manualOverride() ──────────────────────────────────────────
  describe('manualOverride()', () => {
    it('should override status and mark checks as MANUAL_OVERRIDE', async () => {
      const dto = { status: VerificationStatus.VERIFIED, reason: 'Manually verified' };
      repo.findVerificationWithChecks.mockResolvedValue(buildVerificationWithChecks() as never);
      repo.updateVerification.mockResolvedValue(buildVerification({ status: VerificationStatus.VERIFIED }) as never);

      await service.manualOverride(VERIFICATION_ID, WS_ID, dto, USER_ID);

      expect(repo.updateVerification).toHaveBeenCalledWith(
        VERIFICATION_ID,
        expect.objectContaining({
          status: VerificationStatus.VERIFIED,
          overrideNotes: 'Manually verified',
          overriddenBy: USER_ID,
        }),
      );
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      repo.findVerificationWithChecks.mockResolvedValue({
        ...buildVerificationWithChecks(), workspaceId: 'other',
      } as never);
      await expect(
        service.manualOverride(VERIFICATION_ID, WS_ID, { status: VerificationStatus.VERIFIED, reason: 'x' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── configureRules() ──────────────────────────────────────────
  describe('configureRules()', () => {
    it('should merge provided rules with defaults', async () => {
      repo.getRuleConfig.mockResolvedValue(null);
      const dto = { scoreThreshold: 80, businessRegistration: { enabled: true, weight: 25, required: true } };
      const result = await service.configureRules(WS_ID, dto);
      expect(result.scoreThreshold).toBe(80);
      expect(result.businessRegistration.weight).toBe(25);
      expect(repo.upsertRuleConfig).toHaveBeenCalled();
    });
  });

  // ── getRules() ────────────────────────────────────────────────
  describe('getRules()', () => {
    it('should return default rules when none configured', async () => {
      const result = await service.getRules(WS_ID);
      expect(result.scoreThreshold).toBe(70);
      expect(result.businessRegistration).toBeDefined();
    });

    it('should return stored rules when configured', async () => {
      const stored = { ...getDefaultVerificationRules(), scoreThreshold: 80 };
      repo.getRuleConfig.mockResolvedValue(stored);
      const result = await service.getRules(WS_ID);
      expect(result.scoreThreshold).toBe(80);
    });
  });
});
