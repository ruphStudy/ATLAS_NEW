import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscoveryRepository } from './discovery.repository';
import { DiscoveryQueue } from './jobs/discovery.queue';
import { MarketplaceAdapterRegistry } from './adapters/adapter.registry';
import { DiscoveryMode } from './interfaces';
import type {
  IDiscoveryResult,
  IDiscoverySession,
  IDiscoverySessionListResult,
  IDiscoveryStats,
} from './interfaces';
import type {
  CreateDiscoverySessionDto,
  DiscoveryFilterDto,
  DiscoverySessionResponseDto,
  DiscoveryStatsDto,
} from './dto';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly discoveryRepository: DiscoveryRepository,
    private readonly discoveryQueue: DiscoveryQueue,
    private readonly adapterRegistry: MarketplaceAdapterRegistry,
  ) {}

  async createSession(
    dto: CreateDiscoverySessionDto,
    workspaceId: string,
  ): Promise<DiscoverySessionResponseDto> {
    const mode = dto.mode ?? DiscoveryMode.KEYWORD;

    // ASIN is a schema/DTO slot only — no provider implements it yet.
    // Reject clearly here rather than let a session run with nothing to do
    // and silently complete as an empty "success".
    if (mode === DiscoveryMode.ASIN) {
      throw new BadRequestException(
        `Discovery mode '${mode}' is not implemented yet. Supported modes: KEYWORD, TREND_COLD_START.`,
      );
    }

    if (mode === DiscoveryMode.TREND_COLD_START) {
      // Marketplace-neutral by design (Prompt 6) — no adapter, no
      // marketplace/country/keywords are meaningful here; the seed
      // category set is fixed server-side (TREND_DISCOVERY_CONSTANTS).
      const session = await this.discoveryRepository.createSession({
        workspaceId,
        marketplace: 'TREND',
        country: 'GLOBAL',
        categories: [],
        keywords: [],
        mode,
        status: 'PENDING',
      });

      await this.discoveryQueue.enqueue({ sessionId: session.id, workspaceId });
      this.logger.log(`Discovery session created: ${session.id} [TREND_COLD_START]`);
      return this.toResponseDto(session);
    }

    // KEYWORD mode — unchanged.
    const marketplace = dto.marketplace!.toUpperCase();

    if (!this.adapterRegistry.isSupported(marketplace)) {
      throw new BadRequestException(
        `Marketplace '${marketplace}' is not supported. Supported: ${this.adapterRegistry.getSupportedMarketplaces().join(', ')}`,
      );
    }

    const session = await this.discoveryRepository.createSession({
      workspaceId,
      marketplace,
      country: dto.country ?? 'US',
      categories: dto.categories ?? [],
      keywords: dto.keywords ?? [],
      mode,
      status: 'PENDING',
    });

    await this.discoveryQueue.enqueue({ sessionId: session.id, workspaceId });

    this.logger.log(
      `Discovery session created: ${session.id} [${marketplace}/${session.country}] – ${dto.keywords?.length ?? 0} keywords`,
    );

    return this.toResponseDto(session);
  }

  async findAll(
    workspaceId: string,
    filter: DiscoveryFilterDto,
  ): Promise<IDiscoverySessionListResult> {
    const [sessions, total] = await this.discoveryRepository.findAllSessions(
      workspaceId,
      filter,
    );

    return {
      items: sessions,
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async findById(id: string, workspaceId: string): Promise<DiscoverySessionResponseDto> {
    const session = await this.getOrThrow(id, workspaceId);
    return this.toResponseDto(session);
  }

  async findResults(id: string, workspaceId: string): Promise<IDiscoveryResult[]> {
    await this.getOrThrow(id, workspaceId);
    return this.discoveryRepository.findSessionResults(id);
  }

  async cancelSession(
    id: string,
    workspaceId: string,
  ): Promise<DiscoverySessionResponseDto> {
    const session = await this.getOrThrow(id, workspaceId);

    if (session.status === 'COMPLETED' || session.status === 'FAILED') {
      throw new ConflictException(
        `Cannot cancel a session with status '${session.status}'`,
      );
    }

    if (session.status === 'CANCELLED') {
      throw new ConflictException('Session is already cancelled');
    }

    const updated = await this.discoveryRepository.updateSession(id, {
      status: 'CANCELLED',
      completedAt: new Date(),
    });

    this.logger.log(`Discovery session cancelled: ${id}`);
    return this.toResponseDto(updated);
  }

  async getStats(workspaceId: string): Promise<IDiscoveryStats> {
    return this.discoveryRepository.getStats(workspaceId);
  }

  getSupportedMarketplaces(): string[] {
    return this.adapterRegistry.getSupportedMarketplaces();
  }

  // ── Private ───────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<IDiscoverySession> {
    const session = await this.discoveryRepository.findSessionById(id, workspaceId);
    if (!session) throw new NotFoundException(`Discovery session '${id}' not found`);
    return session;
  }

  private toResponseDto(s: IDiscoverySession): DiscoverySessionResponseDto {
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      marketplace: s.marketplace,
      country: s.country,
      categories: s.categories,
      keywords: s.keywords,
      mode: s.mode,
      status: s.status,
      totalDiscovered: s.totalDiscovered,
      newCandidates: s.newOpportunities,
      newOpportunities: s.newOpportunities,
      duplicatesSkipped: s.duplicatesSkipped,
      errorMessage: s.errorMessage,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
