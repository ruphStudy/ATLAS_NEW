import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PricingService } from '../pricing.service';
import { PricingRepository } from '../pricing.repository';
import { PricingCalculationEngine } from '../engines/pricing-calculation.engine';
import { PricingStrategyEngine } from '../engines/pricing-strategy.engine';
import { PricingValidationEngine } from '../engines/pricing-validation.engine';
import { PricingCalculationQueue, PricingEventQueue } from '../jobs';
import { PricingStatus, PricingStrategy } from '../interfaces';
import { CalculatePricingDto, CreatePricingConfigDto } from '../dto';

const mockRepository = {
  createConfig: jest.fn(),
  findConfigById: jest.fn(),
  findActiveConfig: jest.fn(),
  findAllConfigs: jest.fn(),
  updateConfig: jest.fn(),
  softDeleteConfig: jest.fn(),
  createRecord: jest.fn(),
  findRecordById: jest.fn(),
  findLatestRecord: jest.fn(),
  getNextVersion: jest.fn(),
  findAllRecords: jest.fn(),
  findRecordsByProduct: jest.fn(),
  updateRecord: jest.fn(),
  softDeleteRecord: jest.fn(),
  createHistory: jest.fn(),
  findHistory: jest.fn(),
};

const mockCalcQueue = { enqueue: jest.fn() };
const mockEventQueue = { enqueue: jest.fn() };

const WORKSPACE_ID = 'ws-test';
const USER_ID = 'user-test';

function makeRawRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'rec1',
    workspaceId: WORKSPACE_ID,
    catalogProductId: 'prod1',
    configId: null,
    marketplaceKey: 'AMAZON',
    country: 'US',
    currency: 'USD',
    strategy: PricingStrategy.MARGIN_BASED,
    status: PricingStatus.CALCULATED,
    version: 1,
    totalCost: 15,
    marketplaceSellingPrice: 25,
    estimatedMarginPct: 40,
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PricingRepository, useValue: mockRepository },
        PricingCalculationEngine,
        PricingStrategyEngine,
        PricingValidationEngine,
        { provide: PricingCalculationQueue, useValue: mockCalcQueue },
        { provide: PricingEventQueue, useValue: mockEventQueue },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  // ── Config ──────────────────────────────────────────────────

  describe('createConfig()', () => {
    it('creates config and returns DTO', async () => {
      const raw = { id: 'cfg1', workspaceId: WORKSPACE_ID, marketplaceKey: 'AMAZON', country: 'US', currency: 'USD', strategy: PricingStrategy.MARGIN_BASED, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      mockRepository.createConfig.mockResolvedValue(raw);

      const dto: CreatePricingConfigDto = { marketplaceKey: 'AMAZON', commissionPct: 15 };
      const result = await service.createConfig(WORKSPACE_ID, dto, USER_ID);

      expect(mockRepository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WORKSPACE_ID, marketplaceKey: 'AMAZON' }),
      );
      expect(result.marketplaceKey).toBe('AMAZON');
    });
  });

  describe('findConfigById()', () => {
    it('returns config for valid id', async () => {
      const raw = { id: 'cfg1', workspaceId: WORKSPACE_ID, marketplaceKey: 'AMAZON', country: 'US', currency: 'USD', strategy: PricingStrategy.MARGIN_BASED, isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      mockRepository.findConfigById.mockResolvedValue(raw);
      const result = await service.findConfigById('cfg1', WORKSPACE_ID);
      expect(result.id).toBe('cfg1');
    });

    it('throws NotFoundException for missing config', async () => {
      mockRepository.findConfigById.mockResolvedValue(null);
      await expect(service.findConfigById('missing', WORKSPACE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Calculate ────────────────────────────────────────────────

  describe('calculate()', () => {
    const dto: CalculatePricingDto = {
      catalogProductId: 'prod1',
      marketplaceKey: 'AMAZON',
      country: 'US',
      currency: 'USD',
      landedCost: 10,
    };

    beforeEach(() => {
      mockRepository.findActiveConfig.mockResolvedValue(null);
      mockRepository.getNextVersion.mockResolvedValue(1);
      mockRepository.createRecord.mockResolvedValue(makeRawRecord());
      mockEventQueue.enqueue.mockResolvedValue(undefined);
    });

    it('creates a pricing record and returns calculation', async () => {
      const result = await service.calculate(WORKSPACE_ID, dto, USER_ID);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.marketplaceSellingPrice).toBeGreaterThan(0);
    });

    it('enqueues pricing event', async () => {
      await service.calculate(WORKSPACE_ID, dto, USER_ID);
      expect(mockEventQueue.enqueue).toHaveBeenCalledTimes(1);
    });

    it('creates record with correct workspace', async () => {
      await service.calculate(WORKSPACE_ID, dto, USER_ID);
      expect(mockRepository.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WORKSPACE_ID }),
      );
    });
  });

  describe('queueCalculation()', () => {
    it('creates DRAFT record and enqueues job', async () => {
      mockRepository.getNextVersion.mockResolvedValue(1);
      mockRepository.createRecord.mockResolvedValue(makeRawRecord({ status: PricingStatus.DRAFT }));
      mockCalcQueue.enqueue.mockResolvedValue(undefined);

      const dto: CalculatePricingDto = {
        catalogProductId: 'prod1', marketplaceKey: 'AMAZON', landedCost: 10,
      };
      await service.queueCalculation(WORKSPACE_ID, dto, USER_ID);
      expect(mockCalcQueue.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkCalculate()', () => {
    it('processes each item and returns summary', async () => {
      mockRepository.getNextVersion.mockResolvedValue(1);
      mockRepository.createRecord.mockResolvedValue(makeRawRecord({ status: PricingStatus.DRAFT }));
      mockCalcQueue.enqueue.mockResolvedValue(undefined);

      const result = await service.bulkCalculate(WORKSPACE_ID, {
        items: [
          { catalogProductId: 'p1', marketplaceKey: 'AMAZON' },
          { catalogProductId: 'p2', marketplaceKey: 'FLIPKART' },
        ],
      }, USER_ID);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('rejects if items exceed MAX_BULK_ITEMS', async () => {
      const items = Array.from({ length: 501 }, (_, i) => ({
        catalogProductId: `p${i}`, marketplaceKey: 'AMAZON',
      }));
      await expect(service.bulkCalculate(WORKSPACE_ID, { items }, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── Record Management ────────────────────────────────────────

  describe('approveRecord()', () => {
    it('transitions CALCULATED → APPROVED', async () => {
      const raw = makeRawRecord({ status: PricingStatus.CALCULATED });
      mockRepository.findRecordById.mockResolvedValue(raw);
      mockRepository.updateRecord.mockResolvedValue({ ...raw, status: PricingStatus.APPROVED });
      mockEventQueue.enqueue.mockResolvedValue(undefined);

      const result = await service.approveRecord('rec1', WORKSPACE_ID, {}, USER_ID);
      expect(result.status).toBe(PricingStatus.APPROVED);
    });

    it('throws on invalid transition', async () => {
      mockRepository.findRecordById.mockResolvedValue(makeRawRecord({ status: PricingStatus.ARCHIVED }));
      await expect(service.approveRecord('rec1', WORKSPACE_ID, {}, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── Compare ──────────────────────────────────────────────────

  describe('compareAcrossMarketplaces()', () => {
    it('returns comparison rows per marketplace', async () => {
      mockRepository.findRecordsByProduct.mockResolvedValue([
        makeRawRecord({ marketplaceKey: 'AMAZON' }),
        makeRawRecord({ marketplaceKey: 'FLIPKART' }),
      ]);
      const rows = await service.compareAcrossMarketplaces(WORKSPACE_ID, 'prod1');
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.marketplaceKey)).toContain('AMAZON');
    });
  });
});
