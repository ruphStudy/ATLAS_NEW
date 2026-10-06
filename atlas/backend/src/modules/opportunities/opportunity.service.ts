import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpportunityRepository, isUniqueConstraintError } from './opportunity.repository';
import type {
  IOpportunity,
  IOpportunityListResult,
} from './interfaces';
import type {
  CreateOpportunityDto,
  OpportunityFilterDto,
  OpportunityResponseDto,
  UpdateOpportunityDto,
} from './dto';

/**
 * OpportunityService
 *
 * Business rules:
 *   - All operations are workspace-scoped.
 *   - Deletes are soft only.
 *   - Scores are optional (AI fills them asynchronously).
 */
@Injectable()
export class OpportunityService {
  private readonly logger = new Logger(OpportunityService.name);

  constructor(private readonly opportunityRepository: OpportunityRepository) {}

  async create(
    dto: CreateOpportunityDto,
    workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    const country = dto.country ?? 'US';
    const data: Record<string, unknown> = {
      workspaceId,
      keyword: dto.keyword,
      normalizedKeyword: dto.keyword.trim().toLowerCase(),
      marketplace: dto.marketplace,
      country,
      category: dto.category ?? null,
      demandScore: dto.demandScore ?? null,
      competitionScore: dto.competitionScore ?? null,
      supplierScore: dto.supplierScore ?? null,
      profitScore: dto.profitScore ?? null,
      aiScore: dto.aiScore ?? null,
      finalScore: dto.finalScore ?? null,
      recommendation: dto.recommendation ?? null,
      status: dto.status ?? 'DISCOVERED',
      notes: dto.notes ?? null,
    };

    try {
      const opportunity = await this.opportunityRepository.create(data);
      this.logger.log(`Opportunity created: ${opportunity.id} [${opportunity.keyword}]`);
      return this.toResponseDto(opportunity);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException(
          `An opportunity for "${dto.keyword}" on ${dto.marketplace}/${country} already exists in this workspace.`,
        );
      }
      throw err;
    }
  }

  /**
   * Promotes a MarketplaceProductCandidate into a workspace Opportunity —
   * the only path that creates an Opportunity from Discovery data (Prompt
   * 3/4: Discovery itself no longer auto-creates one). Idempotent: a
   * second promotion of the same candidate by the same workspace returns
   * the existing active Opportunity rather than erroring or duplicating.
   * Race-safe: the DB's partial unique index on
   * (workspaceId, marketplaceProductCandidateId) is the actual guarantee —
   * this method never relies on a find-then-create check alone.
   */
  async promoteCandidate(
    marketplaceProductCandidateId: string,
    workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    const candidate = await this.opportunityRepository.findCandidateById(
      marketplaceProductCandidateId,
    );
    if (!candidate) {
      throw new NotFoundException(
        `Marketplace product candidate '${marketplaceProductCandidateId}' not found`,
      );
    }

    const keyword = candidate.title ?? candidate.externalProductId;

    try {
      const opportunity = await this.opportunityRepository.create({
        workspaceId,
        keyword,
        normalizedKeyword: keyword.trim().toLowerCase(),
        marketplace: candidate.marketplaceKey,
        country: candidate.country,
        category: candidate.marketplaceCategory,
        marketplaceProductCandidateId: candidate.id,
        status: 'DISCOVERED',
      });
      this.logger.log(
        `Opportunity ${opportunity.id} created by promoting candidate ${candidate.id}`,
      );
      return this.toResponseDto(opportunity);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const existing = await this.opportunityRepository.findActiveByCandidateId(
          workspaceId,
          candidate.id,
        );
        if (existing) return this.toResponseDto(existing);
      }
      throw err;
    }
  }

  async findAll(
    workspaceId: string,
    filter: OpportunityFilterDto,
  ): Promise<IOpportunityListResult> {
    const [items, total] = await this.opportunityRepository.findAll(workspaceId, filter);
    return {
      items,
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async findById(id: string, workspaceId: string): Promise<OpportunityResponseDto> {
    const opportunity = await this.getOrThrow(id, workspaceId);
    return this.toResponseDto(opportunity);
  }

  async update(
    id: string,
    dto: UpdateOpportunityDto,
    workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    await this.getOrThrow(id, workspaceId);

    const data: Record<string, unknown> = {};
    if (dto.keyword !== undefined) data['keyword'] = dto.keyword;
    if (dto.marketplace !== undefined) data['marketplace'] = dto.marketplace;
    if (dto.country !== undefined) data['country'] = dto.country;
    if (dto.category !== undefined) data['category'] = dto.category;
    if (dto.demandScore !== undefined) data['demandScore'] = dto.demandScore;
    if (dto.competitionScore !== undefined) data['competitionScore'] = dto.competitionScore;
    if (dto.supplierScore !== undefined) data['supplierScore'] = dto.supplierScore;
    if (dto.profitScore !== undefined) data['profitScore'] = dto.profitScore;
    if (dto.aiScore !== undefined) data['aiScore'] = dto.aiScore;
    if (dto.finalScore !== undefined) data['finalScore'] = dto.finalScore;
    if (dto.recommendation !== undefined) data['recommendation'] = dto.recommendation;
    if (dto.status !== undefined) data['status'] = dto.status;
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    const updated = await this.opportunityRepository.update(id, data);
    return this.toResponseDto(updated);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    await this.opportunityRepository.softDelete(id);
    this.logger.log(`Opportunity soft-deleted: ${id}`);
  }

  // ── Private ───────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<IOpportunity> {
    const opp = await this.opportunityRepository.findById(id, workspaceId);
    if (!opp) throw new NotFoundException(`Opportunity '${id}' not found`);
    return opp;
  }

  private toResponseDto(o: IOpportunity): OpportunityResponseDto {
    return {
      id: o.id,
      workspaceId: o.workspaceId,
      keyword: o.keyword,
      marketplace: o.marketplace,
      country: o.country,
      category: o.category,
      marketplaceProductCandidateId: o.marketplaceProductCandidateId,
      demandScore: o.demandScore,
      competitionScore: o.competitionScore,
      supplierScore: o.supplierScore,
      profitScore: o.profitScore,
      aiScore: o.aiScore,
      finalScore: o.finalScore,
      recommendation: o.recommendation,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
