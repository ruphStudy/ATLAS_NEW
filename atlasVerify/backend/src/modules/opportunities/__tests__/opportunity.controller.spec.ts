import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { OpportunityController } from '../opportunity.controller';
import { OpportunityService } from '../opportunity.service';
import { OpportunityStatus } from '../interfaces';
import type { OpportunityResponseDto } from '../dto';
import type { IOpportunityListResult } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const OPP_ID = 'opp-uuid-1234';

const MOCK_RESPONSE: OpportunityResponseDto = {
  id: OPP_ID,
  workspaceId: WS_ID,
  keyword: 'wireless earbuds',
  marketplace: 'AMAZON_US',
  country: 'US',
  category: 'Electronics',
  demandScore: 78.5,
  competitionScore: 42.0,
  supplierScore: 65.0,
  profitScore: 55.0,
  aiScore: 82.0,
  finalScore: 68.5,
  recommendation: 'Recommend sourcing',
  status: OpportunityStatus.DISCOVERED,
  notes: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_LIST: IOpportunityListResult = {
  items: [MOCK_RESPONSE as never],
  total: 1,
  page: 1,
  limit: 20,
};

// ── Test Suite ────────────────────────────────────────────────
describe('OpportunityController', () => {
  let controller: OpportunityController;
  let service: jest.Mocked<OpportunityService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpportunityController],
      providers: [
        {
          provide: OpportunityService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get(OpportunityController);
    service = module.get(OpportunityService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    const dto = { keyword: 'wireless earbuds', marketplace: 'AMAZON_US' };

    it('should return created opportunity', async () => {
      service.create.mockResolvedValue(MOCK_RESPONSE);

      const result = await controller.create(dto as never, WS_ID);

      expect(result).toEqual(MOCK_RESPONSE);
      expect(service.create).toHaveBeenCalledWith(dto, WS_ID);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated opportunities', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST);
      const filter = { page: 1, limit: 20, skip: 0 };

      const result = await controller.findAll(WS_ID, filter as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(WS_ID, filter);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return opportunity by ID', async () => {
      service.findById.mockResolvedValue(MOCK_RESPONSE);

      const result = await controller.findById(OPP_ID, WS_ID);

      expect(result).toEqual(MOCK_RESPONSE);
      expect(service.findById).toHaveBeenCalledWith(OPP_ID, WS_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findById('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { status: OpportunityStatus.VALIDATED };
    const updated = { ...MOCK_RESPONSE, status: OpportunityStatus.VALIDATED };

    it('should return updated opportunity', async () => {
      service.update.mockResolvedValue(updated);

      const result = await controller.update(OPP_ID, dto as never, WS_ID);

      expect(result.status).toBe(OpportunityStatus.VALIDATED);
      expect(service.update).toHaveBeenCalledWith(OPP_ID, dto, WS_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.update('bad-id', dto as never, WS_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should resolve to undefined (204 No Content)', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(OPP_ID, WS_ID);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(OPP_ID, WS_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
