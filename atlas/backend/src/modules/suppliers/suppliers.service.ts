import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { SupplierEventsService } from './events';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
  SupplierFilterDto,
  SupplierResponseDto,
  SupplierListResponseDto,
  SupplierStatusHistoryResponseDto,
} from './dto';
import { SupplierManagementStatus } from './constants';
import { SupplierProviderManager } from '@modules/supplier-provider/manager/supplier-provider.manager';
import type {
  AtlasSupplier,
  SearchSuppliersParams,
  SupplierProviderCode,
  WorkspaceProviderConfig,
} from '@modules/supplier-provider/interfaces';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly repository: SuppliersRepository,
    private readonly events: SupplierEventsService,
    private readonly providerManager: SupplierProviderManager,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async create(workspaceId: string, dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    // Duplicate detection
    const duplicate = await this.repository.findDuplicate(workspaceId, {
      email: dto.contactEmail,
      phone: dto.contactPhone,
      website: dto.website,
      name: dto.name,
      country: dto.country,
      provider: dto.provider,
      providerSupplierId: dto.providerSupplierId,
    });

    if (duplicate) {
      throw new ConflictException(
        `A supplier with matching contact details already exists (id: ${duplicate['id']})`,
      );
    }

    const record = await this.repository.create({
      workspaceId,
      name: dto.name,
      legalName: dto.legalName ?? null,
      provider: dto.provider ?? 'MANUAL',
      providerSupplierId: dto.providerSupplierId ?? null,
      managementStatus: dto.status ?? SupplierManagementStatus.PROSPECT,
      // Keep existing status/tier fields compatible with discovery module
      status: 'PENDING_REVIEW',
      tier: 'UNVERIFIED',
      country: dto.country?.toUpperCase() ?? 'IN',
      city: dto.city ?? null,
      website: dto.website ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      addresses: dto.addresses ?? [],
      contactPersons: dto.contactPersons ?? [],
      businessRegistration: dto.businessRegistration ?? null,
      taxIdentifiers: dto.taxIdentifiers ?? [],
      categories: dto.categories ?? [],
      minOrderQuantity: dto.minOrderQuantity ?? null,
      avgLeadTimeDays: dto.avgLeadTimeDays ?? null,
      paymentTerms: dto.paymentTerms ?? null,
      shippingTerms: dto.shippingTerms ?? null,
      certifications: dto.certifications ?? [],
      overallRating: dto.overallRating ?? null,
      tags: dto.tags ?? [],
      notes: dto.notes ?? null,
      rawData: {},
    });

    // Status history
    await this.repository.createStatusHistory({
      supplierId: record['id'] as string,
      workspaceId,
      previousStatus: null,
      newStatus: dto.status ?? SupplierManagementStatus.PROSPECT,
      reason: 'Initial creation',
    });

    this.events.emitCreated({
      supplierId: record['id'] as string,
      workspaceId,
      name: record['name'] as string,
      provider: record['provider'] as string,
      createdAt: record['createdAt'] as Date,
    });

    this.logger.log(`Supplier created: ${record['id']} [${record['name']}]`);
    return this.mapToResponse(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: SupplierFilterDto): Promise<SupplierListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<SupplierResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const current = await this.getOrThrow(id, workspaceId);

    // Save profile snapshot before mutation
    await this.repository.createProfileHistory({
      supplierId: id,
      workspaceId,
      snapshot: current,
    });

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.legalName !== undefined) data['legalName'] = dto.legalName;
    if (dto.status !== undefined) data['managementStatus'] = dto.status;
    if (dto.country !== undefined) data['country'] = dto.country.toUpperCase();
    if (dto.city !== undefined) data['city'] = dto.city;
    if (dto.website !== undefined) data['website'] = dto.website;
    if (dto.contactEmail !== undefined) data['contactEmail'] = dto.contactEmail;
    if (dto.contactPhone !== undefined) data['contactPhone'] = dto.contactPhone;
    if (dto.addresses !== undefined) data['addresses'] = dto.addresses;
    if (dto.contactPersons !== undefined) data['contactPersons'] = dto.contactPersons;
    if (dto.businessRegistration !== undefined) data['businessRegistration'] = dto.businessRegistration;
    if (dto.taxIdentifiers !== undefined) data['taxIdentifiers'] = dto.taxIdentifiers;
    if (dto.categories !== undefined) data['categories'] = dto.categories;
    if (dto.minOrderQuantity !== undefined) data['minOrderQuantity'] = dto.minOrderQuantity;
    if (dto.avgLeadTimeDays !== undefined) data['avgLeadTimeDays'] = dto.avgLeadTimeDays;
    if (dto.paymentTerms !== undefined) data['paymentTerms'] = dto.paymentTerms;
    if (dto.shippingTerms !== undefined) data['shippingTerms'] = dto.shippingTerms;
    if (dto.certifications !== undefined) data['certifications'] = dto.certifications;
    if (dto.overallRating !== undefined) data['overallRating'] = dto.overallRating;
    if (dto.tags !== undefined) data['tags'] = dto.tags;
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    const updated = await this.repository.update(id, data);

    // Status change within update
    if (dto.status !== undefined && dto.status !== current['managementStatus']) {
      await this.repository.createStatusHistory({
        supplierId: id,
        workspaceId,
        previousStatus: current['managementStatus'] as string,
        newStatus: dto.status,
        reason: 'Updated via profile update',
      });
      this.events.emitStatusChanged({
        supplierId: id,
        workspaceId,
        previousStatus: current['managementStatus'] as string,
        newStatus: dto.status,
      });
    }

    this.events.emitUpdated({ supplierId: id, workspaceId, updatedAt: updated['updatedAt'] as Date });
    return this.mapToResponse(updated);
  }

  // ── Status ───────────────────────────────────────────────────

  async updateStatus(
    id: string,
    workspaceId: string,
    dto: UpdateSupplierStatusDto,
  ): Promise<SupplierResponseDto> {
    const current = await this.getOrThrow(id, workspaceId);
    const previousStatus = current['managementStatus'] as string;

    if (previousStatus === dto.status) {
      return this.mapToResponse(current);
    }

    const updated = await this.repository.update(id, { managementStatus: dto.status });

    await this.repository.createStatusHistory({
      supplierId: id,
      workspaceId,
      previousStatus,
      newStatus: dto.status,
      reason: dto.reason ?? null,
    });

    this.events.emitStatusChanged({
      supplierId: id,
      workspaceId,
      previousStatus,
      newStatus: dto.status,
      reason: dto.reason,
    });

    this.logger.log(`Supplier ${id} status changed: ${previousStatus} → ${dto.status}`);
    return this.mapToResponse(updated);
  }

  // ── Scores (called by verification/scoring modules) ───────────

  async syncVerificationScore(
    id: string,
    workspaceId: string,
    verificationScore: number,
    verificationStatus: string,
  ): Promise<void> {
    await this.repository.update(id, { verificationScore, verificationStatus });
    this.events.emitVerified({ supplierId: id, workspaceId, verificationScore, verificationStatus });
  }

  async syncRiskScore(id: string, workspaceId: string, riskScore: number): Promise<void> {
    await this.repository.update(id, { riskScore });
  }

  async syncPerformanceScore(id: string, workspaceId: string, performanceScore: number): Promise<void> {
    await this.repository.update(id, { performanceScore });
  }

  // ── History ──────────────────────────────────────────────────

  async getStatusHistory(
    id: string,
    workspaceId: string,
  ): Promise<SupplierStatusHistoryResponseDto[]> {
    await this.getOrThrow(id, workspaceId);
    const records = await this.repository.findStatusHistory(id, workspaceId);
    return records.map((r) => ({
      id: r['id'] as string,
      supplierId: r['supplierId'] as string,
      previousStatus: r['previousStatus'] as string | null,
      newStatus: r['newStatus'] as string,
      reason: r['reason'] as string | null,
      changedBy: r['changedBy'] as string | null,
      createdAt: r['createdAt'] as Date,
    }));
  }

  async getProfileHistory(id: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    await this.getOrThrow(id, workspaceId);
    return this.repository.findProfileHistory(id, workspaceId);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    await this.repository.softDelete(id);
    this.logger.log(`Supplier soft-deleted: ${id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Supplier not found: ${id}`);
    return record;
  }

  private mapToResponse(r: Record<string, unknown>): SupplierResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      name: r['name'] as string,
      legalName: r['legalName'] as string | null,
      provider: r['provider'] as string,
      providerSupplierId: r['providerSupplierId'] as string | null,
      status: (r['managementStatus'] ?? r['status']) as SupplierManagementStatus,
      tier: r['tier'] as string,
      country: r['country'] as string,
      city: r['city'] as string | null,
      website: r['website'] as string | null,
      contactEmail: r['contactEmail'] as string | null,
      contactPhone: r['contactPhone'] as string | null,
      addresses: r['addresses'] as never,
      contactPersons: r['contactPersons'] as never,
      businessRegistration: r['businessRegistration'] as never,
      taxIdentifiers: r['taxIdentifiers'] as never,
      categories: (r['categories'] as string[]) ?? [],
      minOrderQuantity: r['minOrderQuantity'] as number | null,
      avgLeadTimeDays: r['avgLeadTimeDays'] as number | null,
      paymentTerms: r['paymentTerms'] as never,
      shippingTerms: r['shippingTerms'] as never,
      certifications: r['certifications'] as never,
      overallRating: r['overallRating'] as number | null,
      verificationScore: r['verificationScore'] as number | null,
      verificationStatus: r['verificationStatus'] as string | null,
      riskScore: r['riskScore'] as number | null,
      performanceScore: r['performanceScore'] as number | null,
      tags: r['tags'] as string[] | null,
      notes: r['notes'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }

  // ── Provider operations ──────────────────────────────────────

  /**
   * Search suppliers across one or more provider platforms and return normalized results.
   * Results are NOT automatically saved; call findOrCreateFromAtlasSupplier to persist.
   */
  async searchViaProvider(
    workspaceId: string,
    params: SearchSuppliersParams,
    options?: { providerCode?: SupplierProviderCode; configs?: WorkspaceProviderConfig[] },
  ): Promise<AtlasSupplier[]> {
    const results: AtlasSupplier[] = [];
    for await (const supplier of this.providerManager.searchSuppliers(workspaceId, params, options)) {
      results.push(supplier);
    }
    return results;
  }

  /**
   * Synchronize a supplier's profile from its provider identity.
   * Fetches the latest data using SupplierProviderManager and updates the local record.
   */
  async syncFromProvider(
    id: string,
    workspaceId: string,
    providerCode: SupplierProviderCode,
    options?: { configs?: WorkspaceProviderConfig[] },
  ): Promise<SupplierResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    const identities = await this.repository.findProviderIdentities(id);
    const identity = identities.find((i) => i['providerCode'] === providerCode);

    if (!identity) {
      throw new NotFoundException(
        `Supplier ${id} has no provider identity for provider: ${providerCode}`,
      );
    }

    const response = await this.providerManager.getSupplierDetails(
      workspaceId,
      { providerSupplierId: identity['providerSupplierId'] as string },
      { providerCode, ...options },
    );

    if (!response.success || !response.data) {
      this.logger.warn(`Provider sync failed for supplier ${id}: ${response.error?.message}`);
      return this.mapToResponse(record);
    }

    const atlas = response.data;
    const syncData: Record<string, unknown> = {
      name: atlas.name,
      country: atlas.country.toUpperCase(),
      city: atlas.city ?? record['city'],
      website: atlas.website ?? record['website'],
      contactEmail: atlas.contactEmail ?? record['contactEmail'],
      contactPhone: atlas.contactPhone ?? record['contactPhone'],
      categories: atlas.categories.length ? atlas.categories : record['categories'],
      minOrderQuantity: atlas.minOrderQuantity ?? record['minOrderQuantity'],
      avgLeadTimeDays: atlas.avgLeadTimeDays ?? record['avgLeadTimeDays'],
      overallRating: atlas.overallRating ?? record['overallRating'],
    };

    const updated = await this.repository.update(id, syncData);

    await this.repository.upsertProviderIdentity({
      supplierId: id,
      workspaceId,
      providerCode,
      providerSupplierId: atlas.providerSupplierId,
      syncedAt: new Date(),
      rawData: atlas.rawData ?? {},
    });

    this.logger.log(`Supplier ${id} synced from provider ${providerCode}`);
    return this.mapToResponse(updated);
  }

  /**
   * Find an existing supplier matching a normalized AtlasSupplier or create a new one.
   * Also upserts the provider identity link.
   */
  async findOrCreateFromAtlasSupplier(
    workspaceId: string,
    atlas: AtlasSupplier,
  ): Promise<SupplierResponseDto> {
    // Check provider identity first (fastest path)
    const existing = await this.repository.findByProviderIdentity(
      workspaceId,
      atlas.providerCode,
      atlas.providerSupplierId,
    );

    if (existing) {
      const supplier = (existing['supplier'] as Record<string, unknown>) ?? existing;
      const supplierId = supplier['id'] as string;
      await this.repository.upsertProviderIdentity({
        supplierId,
        workspaceId,
        providerCode: atlas.providerCode,
        providerSupplierId: atlas.providerSupplierId,
        syncedAt: new Date(),
        rawData: atlas.rawData ?? {},
      });
      return this.mapToResponse(supplier);
    }

    // Create new supplier record from normalized data
    const record = await this.repository.create({
      workspaceId,
      name: atlas.name,
      legalName: null,
      provider: atlas.providerCode,
      providerSupplierId: atlas.providerSupplierId,
      managementStatus: SupplierManagementStatus.PROSPECT,
      status: 'PENDING_REVIEW',
      tier: 'UNVERIFIED',
      country: atlas.country.toUpperCase(),
      city: atlas.city ?? null,
      website: atlas.website ?? null,
      contactEmail: atlas.contactEmail ?? null,
      contactPhone: atlas.contactPhone ?? null,
      addresses: [],
      contactPersons: [],
      businessRegistration: null,
      taxIdentifiers: [],
      categories: atlas.categories ?? [],
      minOrderQuantity: atlas.minOrderQuantity ?? null,
      avgLeadTimeDays: atlas.avgLeadTimeDays ?? null,
      paymentTerms: null,
      shippingTerms: null,
      certifications: [],
      overallRating: atlas.overallRating ?? null,
      tags: [],
      notes: null,
      rawData: atlas.rawData ?? {},
    });

    await this.repository.upsertProviderIdentity({
      supplierId: record['id'] as string,
      workspaceId,
      providerCode: atlas.providerCode,
      providerSupplierId: atlas.providerSupplierId,
      syncedAt: new Date(),
      rawData: atlas.rawData ?? {},
    });

    this.events.emitCreated({
      supplierId: record['id'] as string,
      workspaceId,
      name: record['name'] as string,
      provider: record['provider'] as string,
      createdAt: record['createdAt'] as Date,
    });

    return this.mapToResponse(record);
  }

  async getProviderIdentities(id: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    await this.getOrThrow(id, workspaceId);
    return this.repository.findProviderIdentities(id);
  }
}
