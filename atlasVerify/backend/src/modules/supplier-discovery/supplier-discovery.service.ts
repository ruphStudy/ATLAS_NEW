import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupplierDiscoveryRepository } from './supplier-discovery.repository';
import { SupplierDiscoveryQueue } from './jobs/supplier-discovery.queue';
import { SupplierProviderRegistry } from './providers/provider.registry';
import type {
  IOpportunitySupplierLink,
  ISupplier,
  ISupplierDiscoverySession,
  ISupplierDiscoverySessionListResult,
  ISupplierDiscoveryStats,
  ISupplierListResult,
} from './interfaces';
import type {
  CreateSupplierDiscoverySessionDto,
  CreateSupplierDto,
  LinkOpportunityDto,
  SupplierDiscoverySessionResponseDto,
  SupplierFilterDto,
  SupplierResponseDto,
  SupplierSessionFilterDto,
  UpdateSupplierDto,
} from './dto';

@Injectable()
export class SupplierDiscoveryService {
  private readonly logger = new Logger(SupplierDiscoveryService.name);

  constructor(
    private readonly repository: SupplierDiscoveryRepository,
    private readonly queue: SupplierDiscoveryQueue,
    private readonly providerRegistry: SupplierProviderRegistry,
  ) {}

  // ── Supplier CRUD ────────────────────────────────────────────

  async createSupplier(dto: CreateSupplierDto, workspaceId: string): Promise<SupplierResponseDto> {
    const supplier = await this.repository.createSupplier({
      workspaceId,
      name: dto.name,
      provider: dto.provider ?? 'MANUAL',
      country: dto.country?.toUpperCase() ?? 'IN',
      city: dto.city ?? null,
      website: dto.website ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      tier: dto.tier ?? 'UNVERIFIED',
      status: dto.status ?? 'PENDING_REVIEW',
      categories: dto.categories ?? [],
      minOrderQuantity: dto.minOrderQuantity ?? null,
      avgLeadTimeDays: dto.avgLeadTimeDays ?? null,
      overallRating: dto.overallRating ?? null,
      notes: dto.notes ?? null,
      rawData: {},
    });
    this.logger.log(`Supplier created: ${supplier.id} [${supplier.name}]`);
    return this.toSupplierDto(supplier);
  }

  async findAllSuppliers(workspaceId: string, filter: SupplierFilterDto): Promise<ISupplierListResult> {
    const [items, total] = await this.repository.findAllSuppliers(workspaceId, filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  async findSupplierById(id: string, workspaceId: string): Promise<SupplierResponseDto> {
    const supplier = await this.getSupplierOrThrow(id, workspaceId);
    return this.toSupplierDto(supplier);
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto, workspaceId: string): Promise<SupplierResponseDto> {
    await this.getSupplierOrThrow(id, workspaceId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.country !== undefined) data['country'] = dto.country.toUpperCase();
    if (dto.city !== undefined) data['city'] = dto.city;
    if (dto.website !== undefined) data['website'] = dto.website;
    if (dto.contactEmail !== undefined) data['contactEmail'] = dto.contactEmail;
    if (dto.contactPhone !== undefined) data['contactPhone'] = dto.contactPhone;
    if (dto.tier !== undefined) data['tier'] = dto.tier;
    if (dto.status !== undefined) data['status'] = dto.status;
    if (dto.categories !== undefined) data['categories'] = dto.categories;
    if (dto.minOrderQuantity !== undefined) data['minOrderQuantity'] = dto.minOrderQuantity;
    if (dto.avgLeadTimeDays !== undefined) data['avgLeadTimeDays'] = dto.avgLeadTimeDays;
    if (dto.overallRating !== undefined) data['overallRating'] = dto.overallRating;
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    const updated = await this.repository.updateSupplier(id, data);
    return this.toSupplierDto(updated);
  }

  async removeSupplier(id: string, workspaceId: string): Promise<void> {
    await this.getSupplierOrThrow(id, workspaceId);
    await this.repository.softDeleteSupplier(id);
    this.logger.log(`Supplier soft-deleted: ${id}`);
  }

  // ── Opportunity linking ───────────────────────────────────────

  async linkToOpportunity(
    supplierId: string,
    opportunityId: string,
    workspaceId: string,
    dto: LinkOpportunityDto,
  ): Promise<IOpportunitySupplierLink> {
    await this.getSupplierOrThrow(supplierId, workspaceId);
    return this.repository.linkToOpportunity({
      supplierId,
      opportunityId,
      workspaceId,
      rank: dto.rank ?? 0,
      notes: dto.notes ?? null,
    });
  }

  async unlinkFromOpportunity(supplierId: string, opportunityId: string, workspaceId: string): Promise<void> {
    await this.getSupplierOrThrow(supplierId, workspaceId);
    await this.repository.unlinkFromOpportunity(supplierId, opportunityId, workspaceId);
  }

  async getOpportunitySuppliers(opportunityId: string, workspaceId: string): Promise<IOpportunitySupplierLink[]> {
    return this.repository.getOpportunitySuppliers(opportunityId, workspaceId);
  }

  // ── Discovery sessions ────────────────────────────────────────

  async createSession(dto: CreateSupplierDiscoverySessionDto, workspaceId: string): Promise<SupplierDiscoverySessionResponseDto> {
    if (!this.providerRegistry.isSupported(dto.provider)) {
      const supported = this.providerRegistry.getSupportedProviders().join(', ');
      throw new NotFoundException(`Provider '${dto.provider}' not supported. Supported: ${supported}`);
    }

    const session = await this.repository.createSession({
      workspaceId,
      provider: dto.provider,
      keyword: dto.keyword,
      country: dto.country ?? 'IN',
      category: dto.category ?? null,
      status: 'PENDING',
    });

    await this.queue.enqueue({ sessionId: session.id, workspaceId });
    this.logger.log(`Supplier discovery session created: ${session.id} [${dto.provider}/${dto.keyword}]`);
    return this.toSessionDto(session);
  }

  async findAllSessions(workspaceId: string, filter: SupplierSessionFilterDto): Promise<ISupplierDiscoverySessionListResult> {
    const [items, total] = await this.repository.findAllSessions(workspaceId, filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  async findSessionById(id: string, workspaceId: string): Promise<SupplierDiscoverySessionResponseDto> {
    const session = await this.getSessionOrThrow(id, workspaceId);
    return this.toSessionDto(session);
  }

  async findSessionResults(id: string, workspaceId: string): Promise<unknown[]> {
    await this.getSessionOrThrow(id, workspaceId);
    return this.repository.findSessionResults(id);
  }

  async cancelSession(id: string, workspaceId: string): Promise<SupplierDiscoverySessionResponseDto> {
    const session = await this.getSessionOrThrow(id, workspaceId);
    if (session.status === 'COMPLETED' || session.status === 'FAILED') {
      throw new ConflictException(`Cannot cancel a session with status '${session.status}'`);
    }
    if (session.status === 'CANCELLED') throw new ConflictException('Session is already cancelled');

    const updated = await this.repository.updateSession(id, { status: 'CANCELLED', completedAt: new Date() });
    return this.toSessionDto(updated);
  }

  async getStats(workspaceId: string): Promise<ISupplierDiscoveryStats> {
    return this.repository.getStats(workspaceId);
  }

  getSupportedProviders(): string[] {
    return this.providerRegistry.getSupportedProviders();
  }

  // ── Private ───────────────────────────────────────────────────

  private async getSupplierOrThrow(id: string, workspaceId: string): Promise<ISupplier> {
    const supplier = await this.repository.findSupplierById(id, workspaceId);
    if (!supplier) throw new NotFoundException(`Supplier '${id}' not found`);
    return supplier;
  }

  private async getSessionOrThrow(id: string, workspaceId: string): Promise<ISupplierDiscoverySession> {
    const session = await this.repository.findSessionById(id, workspaceId);
    if (!session) throw new NotFoundException(`Supplier discovery session '${id}' not found`);
    return session;
  }

  private toSupplierDto(s: ISupplier): SupplierResponseDto {
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      name: s.name,
      provider: s.provider,
      providerSupplierId: s.providerSupplierId,
      country: s.country,
      city: s.city,
      website: s.website,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      tier: s.tier,
      status: s.status,
      categories: s.categories,
      minOrderQuantity: s.minOrderQuantity,
      avgLeadTimeDays: s.avgLeadTimeDays,
      overallRating: s.overallRating,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private toSessionDto(s: ISupplierDiscoverySession): SupplierDiscoverySessionResponseDto {
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      provider: s.provider,
      keyword: s.keyword,
      country: s.country,
      category: s.category,
      status: s.status,
      totalDiscovered: s.totalDiscovered,
      newSuppliers: s.newSuppliers,
      duplicatesSkipped: s.duplicatesSkipped,
      errorMessage: s.errorMessage,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
