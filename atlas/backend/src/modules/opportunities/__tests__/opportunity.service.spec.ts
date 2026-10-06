import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OpportunityService } from '../opportunity.service';
import { OpportunityRepository } from '../opportunity.repository';
import { OpportunityStatus } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const OPP_ID = 'opp-uuid-1234';
const CANDIDATE_ID = 'candidate-uuid-5678';

function buildOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: OPP_ID,
    workspaceId: WS_ID,
    keyword: 'wireless earbuds',
    normalizedKeyword: 'wireless earbuds',
    marketplace: 'AMAZON_US',
    country: 'US',
    category: 'Electronics',
    marketplaceProductCandidateId: null,
    demandScore: 78.5,
    competitionScore: 42.0,
    supplierScore: 65.0,
    profitScore: 55.0,
    aiScore: 82.0,
    finalScore: 68.5,
    recommendation: 'Recommend sourcing',
    status: OpportunityStatus.DISCOVERED,
    notes: null,
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: CANDIDATE_ID,
    marketplaceKey: 'AMAZON_US',
    country: 'US',
    externalProductId: 'B0REALASIN9',
    title: 'Real Wireless Earbuds',
    marketplaceCategory: 'Electronics',
    ...overrides,
  };
}

/** Shape of a Prisma P2002 unique-constraint violation, per this codebase's existing detection convention. */
function uniqueConstraintError() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

const MOCK_OPP = buildOpportunity();
const MOCK_CANDIDATE = buildCandidate();

// ── Test Suite ────────────────────────────────────────────────
describe('OpportunityService', () => {
  let service: OpportunityService;
  let repo: jest.Mocked<OpportunityRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        {
          provide: OpportunityRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn().mockResolvedValue(undefined),
            findCandidateById: jest.fn(),
            findActiveByCandidateId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OpportunityService);
    repo = module.get(OpportunityRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      keyword: 'wireless earbuds',
      marketplace: 'AMAZON_US',
      country: 'US',
      category: 'Electronics',
      finalScore: 68.5,
    };

    it('should create and return an opportunity DTO', async () => {
      repo.create.mockResolvedValue(MOCK_OPP as never);

      const result = await service.create(dto, WS_ID);

      expect(result.id).toBe(OPP_ID);
      expect(result.keyword).toBe('wireless earbuds');
      expect(result.workspaceId).toBe(WS_ID);
    });

    it('should set workspaceId from parameter, not DTO', async () => {
      repo.create.mockResolvedValue(MOCK_OPP as never);

      await service.create(dto, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WS_ID }),
      );
    });

    it('should default status to DISCOVERED', async () => {
      repo.create.mockResolvedValue(MOCK_OPP as never);

      await service.create(dto, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DISCOVERED' }),
      );
    });

    it('should default country to US when not provided', async () => {
      const { country: _c, ...dtoWithoutCountry } = dto;
      repo.create.mockResolvedValue(MOCK_OPP as never);

      await service.create(dtoWithoutCountry, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'US' }),
      );
    });

    it('should not expose deletedAt in response', async () => {
      repo.create.mockResolvedValue(MOCK_OPP as never);

      const result = await service.create(dto, WS_ID);

      expect(result).not.toHaveProperty('deletedAt');
    });

    it('should pass a trimmed, lowercased normalizedKeyword to the repository (Case 11)', async () => {
      repo.create.mockResolvedValue(MOCK_OPP as never);

      await service.create({ ...dto, keyword: '  Wireless Earbuds  ' }, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ normalizedKeyword: 'wireless earbuds' }),
      );
    });

    it('should translate a manual duplicate (DB unique violation) into ConflictException, not a raw error', async () => {
      repo.create.mockRejectedValue(uniqueConstraintError());

      await expect(service.create(dto, WS_ID)).rejects.toThrow(ConflictException);
    });
  });

  // ── promoteCandidate() ──────────────────────────────────────────
  describe('promoteCandidate()', () => {
    it('should throw NotFoundException when the candidate does not exist', async () => {
      repo.findCandidateById.mockResolvedValue(null);

      await expect(service.promoteCandidate('missing-id', WS_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should create an Opportunity linked to the candidate on first promotion', async () => {
      repo.findCandidateById.mockResolvedValue(MOCK_CANDIDATE as never);
      repo.create.mockResolvedValue(
        buildOpportunity({ marketplaceProductCandidateId: CANDIDATE_ID }) as never,
      );

      const result = await service.promoteCandidate(CANDIDATE_ID, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WS_ID,
          marketplaceProductCandidateId: CANDIDATE_ID,
          marketplace: MOCK_CANDIDATE.marketplaceKey,
          country: MOCK_CANDIDATE.country,
        }),
      );
      expect(result.marketplaceProductCandidateId).toBe(CANDIDATE_ID);
    });

    it('should never trust a workspaceId supplied anywhere except the authenticated parameter', async () => {
      repo.findCandidateById.mockResolvedValue(MOCK_CANDIDATE as never);
      repo.create.mockResolvedValue(MOCK_OPP as never);

      await service.promoteCandidate(CANDIDATE_ID, WS_ID);

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS_ID }));
    });

    it('should be idempotent: a second promotion of the same candidate returns the existing active Opportunity instead of erroring', async () => {
      repo.findCandidateById.mockResolvedValue(MOCK_CANDIDATE as never);
      repo.create.mockRejectedValue(uniqueConstraintError());
      const existing = buildOpportunity({ marketplaceProductCandidateId: CANDIDATE_ID });
      repo.findActiveByCandidateId.mockResolvedValue(existing as never);

      const result = await service.promoteCandidate(CANDIDATE_ID, WS_ID);

      expect(result.id).toBe(existing.id);
      expect(repo.findActiveByCandidateId).toHaveBeenCalledWith(WS_ID, CANDIDATE_ID);
    });

    it('should allow two different workspaces to independently promote the same shared candidate (workspace isolation)', async () => {
      repo.findCandidateById.mockResolvedValue(MOCK_CANDIDATE as never);
      repo.create
        .mockResolvedValueOnce(
          buildOpportunity({ id: 'opp-ws-a', workspaceId: 'workspace-a' }) as never,
        )
        .mockResolvedValueOnce(
          buildOpportunity({ id: 'opp-ws-b', workspaceId: 'workspace-b' }) as never,
        );

      const a = await service.promoteCandidate(CANDIDATE_ID, 'workspace-a');
      const b = await service.promoteCandidate(CANDIDATE_ID, 'workspace-b');

      expect(a.id).not.toBe(b.id);
      expect(repo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ workspaceId: 'workspace-a' }),
      );
      expect(repo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ workspaceId: 'workspace-b' }),
      );
    });

    it('should propagate non-conflict errors from the repository', async () => {
      repo.findCandidateById.mockResolvedValue(MOCK_CANDIDATE as never);
      repo.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.promoteCandidate(CANDIDATE_ID, WS_ID)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    const filter = { page: 1, limit: 20, skip: 0 };

    it('should return paginated result', async () => {
      repo.findAll.mockResolvedValue([[MOCK_OPP as never], 1]);

      const result = await service.findAll(WS_ID, filter as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should return empty list when no opportunities exist', async () => {
      repo.findAll.mockResolvedValue([[], 0]);

      const result = await service.findAll(WS_ID, filter as never);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return opportunity by ID', async () => {
      repo.findById.mockResolvedValue(MOCK_OPP as never);

      const result = await service.findById(OPP_ID, WS_ID);

      expect(result.id).toBe(OPP_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when belongs to different workspace', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById(OPP_ID, 'other-workspace')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { status: OpportunityStatus.VALIDATED, finalScore: 90 };
    const updated = buildOpportunity({ status: OpportunityStatus.VALIDATED, finalScore: 90 });

    it('should update and return the opportunity', async () => {
      repo.findById.mockResolvedValue(MOCK_OPP as never);
      repo.update.mockResolvedValue(updated as never);

      const result = await service.update(OPP_ID, dto, WS_ID);

      expect(result.status).toBe(OpportunityStatus.VALIDATED);
      expect(result.finalScore).toBe(90);
    });

    it('should only pass provided fields to repository', async () => {
      repo.findById.mockResolvedValue(MOCK_OPP as never);
      repo.update.mockResolvedValue(updated as never);

      await service.update(OPP_ID, { status: OpportunityStatus.VALIDATED }, WS_ID);

      expect(repo.update).toHaveBeenCalledWith(
        OPP_ID,
        expect.objectContaining({ status: OpportunityStatus.VALIDATED }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        OPP_ID,
        expect.not.objectContaining({ keyword: expect.anything() }),
      );
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', dto, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should soft-delete the opportunity', async () => {
      repo.findById.mockResolvedValue(MOCK_OPP as never);

      await expect(service.remove(OPP_ID, WS_ID)).resolves.toBeUndefined();
      expect(repo.softDelete).toHaveBeenCalledWith(OPP_ID);
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });

    it('should not call softDelete when opportunity not found', async () => {
      repo.findById.mockResolvedValue(null);

      await service.remove('bad-id', WS_ID).catch(() => null);

      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
