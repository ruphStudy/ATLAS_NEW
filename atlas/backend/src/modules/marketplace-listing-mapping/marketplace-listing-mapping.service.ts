import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceListingMappingRepository } from './marketplace-listing-mapping.repository';
import { MarketplaceMappingFactory } from './registry/marketplace-mapping.factory';
import { TransformationQueue } from './jobs/transformation.queue';
import { MappingEventQueue } from './jobs/mapping-event.queue';
import {
  MappingStatus,
  CategoryMappingStatus,
  AttributeTransformType,
  MarketplaceMappingEvent,
  TransformationStatus,
  ICategoryMapping,
  IAttributeMapping,
  IMarketplaceSchema,
  UniversalListingInput,
} from './interfaces';
import {
  CreateMarketplaceSchemaDto,
  UpdateMarketplaceSchemaDto,
  CreateMappingConfigDto,
  PublishMappingConfigDto,
  RollbackMappingConfigDto,
  CreateCategoryMappingDto,
  CreateAttributeMappingDto,
  MappingFilterDto,
  CategoryMappingFilterDto,
  TransformationJobFilterDto,
  TransformListingDto,
  ValidateTransformedListingDto,
  MarketplaceSchemaResponseDto,
  CategoryMappingResponseDto,
  AttributeMappingResponseDto,
  MappingConfigResponseDto,
  TransformationJobResponseDto,
  PaginatedResponseDto,
} from './dto';
import { MARKETPLACE_MAPPING_CONSTANTS, MAPPING_ERROR_CODES } from './constants';

@Injectable()
export class MarketplaceListingMappingService {
  private readonly logger = new Logger(MarketplaceListingMappingService.name);

  constructor(
    private readonly repository: MarketplaceListingMappingRepository,
    private readonly factory: MarketplaceMappingFactory,
    private readonly transformationQueue: TransformationQueue,
    private readonly eventQueue: MappingEventQueue,
  ) {}

  // ── Helpers ───────────────────────────────────────────────

  private async findSchemaOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findSchemaById(id, workspaceId);
    if (!record) throw new NotFoundException(`Marketplace schema ${id} not found`);
    return record;
  }

  private async findConfigOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findMappingConfigById(id, workspaceId);
    if (!record) throw new NotFoundException(`Mapping config ${id} not found`);
    return record;
  }

  private assertStatusTransition(
    current: MappingStatus,
    next: MappingStatus,
    entity: string,
  ): void {
    const allowed = MARKETPLACE_MAPPING_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition ${entity} from ${current} to ${next}`,
      );
    }
  }

  // ── Schema Management ──────────────────────────────────────

  async createSchema(
    workspaceId: string,
    dto: CreateMarketplaceSchemaDto,
    createdBy: string,
  ): Promise<MarketplaceSchemaResponseDto> {
    const record = await this.repository.createSchema({
      workspaceId,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      country: dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY,
      region: dto.region ?? null,
      locale: dto.locale ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_LOCALE,
      currency: dto.currency ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_CURRENCY,
      category: dto.category ?? null,
      schemaVersion: dto.schemaVersion ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_SCHEMA_VERSION,
      status: dto.status ?? MappingStatus.DRAFT,
      isDefault: dto.isDefault ?? false,
      requiredFields: dto.requiredFields ?? [],
      optionalFields: dto.optionalFields ?? [],
      mediaRequirements: dto.mediaRequirements ?? {},
      variantRules: dto.variantRules ?? {},
      contentRules: dto.contentRules ?? {},
      pricingRequirements: dto.pricingRequirements ?? {},
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdBy,
    });

    await this.eventQueue.enqueue({
      entityId: record['id'] as string,
      workspaceId,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      event: MarketplaceMappingEvent.MAPPING_CREATED,
      triggeredBy: createdBy,
    });

    return MarketplaceSchemaResponseDto.from(record);
  }

  async findSchemas(
    workspaceId: string,
    filter: MappingFilterDto,
  ): Promise<PaginatedResponseDto<MarketplaceSchemaResponseDto>> {
    const [items, total] = await this.repository.findSchemas(workspaceId, filter);
    return PaginatedResponseDto.of(
      items.map(MarketplaceSchemaResponseDto.from),
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  async findSchemaById(id: string, workspaceId: string): Promise<MarketplaceSchemaResponseDto> {
    const record = await this.findSchemaOrFail(id, workspaceId);
    return MarketplaceSchemaResponseDto.from(record);
  }

  async updateSchema(
    id: string,
    workspaceId: string,
    dto: UpdateMarketplaceSchemaDto,
    updatedBy: string,
  ): Promise<MarketplaceSchemaResponseDto> {
    const existing = await this.findSchemaOrFail(id, workspaceId);
    const currentStatus = existing['status'] as MappingStatus;
    if (currentStatus === MappingStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived schema');
    }

    const updates: Record<string, unknown> = {};
    if (dto.status) {
      this.assertStatusTransition(currentStatus, dto.status, 'schema');
      updates['status'] = dto.status;
      if (dto.status === MappingStatus.PUBLISHED) {
        updates['approvedBy'] = updatedBy;
      }
    }

    const fields = [
      'region', 'locale', 'currency', 'category', 'isDefault',
      'requiredFields', 'optionalFields', 'mediaRequirements', 'variantRules',
      'contentRules', 'pricingRequirements',
    ] as const;
    for (const f of fields) {
      if (dto[f] !== undefined) updates[f] = dto[f];
    }

    if (dto.effectiveFrom) updates['effectiveFrom'] = new Date(dto.effectiveFrom);
    if (dto.effectiveTo) updates['effectiveTo'] = new Date(dto.effectiveTo);

    const record = await this.repository.updateSchema(id, updates);

    await this.eventQueue.enqueue({
      entityId: id,
      workspaceId,
      marketplaceKey: record['marketplaceKey'] as string,
      event: MarketplaceMappingEvent.MAPPING_UPDATED,
      triggeredBy: updatedBy,
    });

    return MarketplaceSchemaResponseDto.from(record);
  }

  async publishSchema(id: string, workspaceId: string, approvedBy: string): Promise<MarketplaceSchemaResponseDto> {
    const existing = await this.findSchemaOrFail(id, workspaceId);
    this.assertStatusTransition(existing['status'] as MappingStatus, MappingStatus.PUBLISHED, 'schema');

    const record = await this.repository.updateSchema(id, {
      status: MappingStatus.PUBLISHED,
      approvedBy,
    });

    await this.eventQueue.enqueue({
      entityId: id,
      workspaceId,
      marketplaceKey: record['marketplaceKey'] as string,
      event: MarketplaceMappingEvent.MAPPING_PUBLISHED,
      triggeredBy: approvedBy,
    });

    return MarketplaceSchemaResponseDto.from(record);
  }

  // ── Category Mapping Management ────────────────────────────

  async createCategoryMapping(
    workspaceId: string,
    dto: CreateCategoryMappingDto,
    createdBy: string,
  ): Promise<CategoryMappingResponseDto> {
    const record = await this.repository.createCategoryMapping({
      workspaceId,
      universalCategory: dto.universalCategory,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      country: dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY,
      marketplaceCategory: dto.marketplaceCategory,
      marketplaceCategoryId: dto.marketplaceCategoryId ?? null,
      categoryPath: dto.categoryPath ?? null,
      confidence: dto.confidence ?? 100,
      status: dto.isManualOverride ? CategoryMappingStatus.MANUALLY_MAPPED : CategoryMappingStatus.AUTO_MAPPED,
      isManualOverride: dto.isManualOverride ?? false,
      version: 1,
      createdBy,
      updatedBy: createdBy,
    });
    return CategoryMappingResponseDto.from(record);
  }

  async findCategoryMappings(
    workspaceId: string,
    filter: CategoryMappingFilterDto,
  ): Promise<PaginatedResponseDto<CategoryMappingResponseDto>> {
    const [items, total] = await this.repository.findCategoryMappings(workspaceId, filter);
    return PaginatedResponseDto.of(
      items.map(CategoryMappingResponseDto.from),
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  async updateCategoryMapping(
    id: string,
    workspaceId: string,
    dto: CreateCategoryMappingDto,
    updatedBy: string,
  ): Promise<CategoryMappingResponseDto> {
    const updates: Record<string, unknown> = {
      marketplaceCategory: dto.marketplaceCategory,
      marketplaceCategoryId: dto.marketplaceCategoryId ?? null,
      categoryPath: dto.categoryPath ?? null,
      confidence: dto.confidence ?? 100,
      isManualOverride: dto.isManualOverride ?? false,
      status: dto.isManualOverride ? CategoryMappingStatus.MANUALLY_MAPPED : CategoryMappingStatus.AUTO_MAPPED,
      updatedBy,
    };
    const record = await this.repository.updateCategoryMapping(id, workspaceId, updates);
    return CategoryMappingResponseDto.from(record);
  }

  // ── Attribute Mapping Management ───────────────────────────

  async createAttributeMapping(
    workspaceId: string,
    dto: CreateAttributeMappingDto,
    createdBy: string,
  ): Promise<AttributeMappingResponseDto> {
    const record = await this.repository.createAttributeMapping({
      workspaceId,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      country: dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY,
      universalAttribute: dto.universalAttribute,
      marketplaceAttribute: dto.marketplaceAttribute,
      transformType: dto.transformType ?? AttributeTransformType.DIRECT,
      valueMapping: dto.valueMapping ?? null,
      unitConversion: dto.unitConversion ?? null,
      defaultValue: dto.defaultValue ?? null,
      isRequired: dto.isRequired ?? false,
      isManualOverride: dto.isManualOverride ?? false,
      conditions: dto.conditions ?? null,
      derivedExpression: dto.derivedExpression ?? null,
      version: 1,
      status: MappingStatus.PUBLISHED,
    });
    return AttributeMappingResponseDto.from(record);
  }

  async updateAttributeMapping(
    id: string,
    dto: CreateAttributeMappingDto,
  ): Promise<AttributeMappingResponseDto> {
    const record = await this.repository.updateAttributeMapping(id, {
      transformType: dto.transformType,
      valueMapping: dto.valueMapping ?? null,
      unitConversion: dto.unitConversion ?? null,
      defaultValue: dto.defaultValue ?? null,
      isRequired: dto.isRequired ?? false,
      conditions: dto.conditions ?? null,
      derivedExpression: dto.derivedExpression ?? null,
    });
    return AttributeMappingResponseDto.from(record);
  }

  // ── Mapping Config Management ──────────────────────────────

  async createMappingConfig(
    workspaceId: string,
    dto: CreateMappingConfigDto,
    createdBy: string,
  ): Promise<MappingConfigResponseDto> {
    const record = await this.repository.createMappingConfig({
      workspaceId,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      country: dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY,
      category: dto.category ?? null,
      schemaVersion: dto.schemaVersion ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_SCHEMA_VERSION,
      status: MappingStatus.DRAFT,
      mappingVersion: 1,
      isDefault: dto.isDefault ?? false,
      overrides: dto.overrides ?? null,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdBy,
    });

    await this.repository.createVersionHistory({
      configId: record['id'] as string,
      workspaceId,
      mappingVersion: 1,
      schemaVersion: record['schemaVersion'] as string,
      status: MappingStatus.DRAFT,
      overrides: null,
      createdBy,
    });

    await this.eventQueue.enqueue({
      entityId: record['id'] as string,
      workspaceId,
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      event: MarketplaceMappingEvent.MAPPING_CREATED,
      triggeredBy: createdBy,
    });

    return MappingConfigResponseDto.from(record);
  }

  async findMappingConfigs(
    workspaceId: string,
    filter: MappingFilterDto,
  ): Promise<PaginatedResponseDto<MappingConfigResponseDto>> {
    const [items, total] = await this.repository.findMappingConfigs(workspaceId, filter);
    return PaginatedResponseDto.of(
      items.map(MappingConfigResponseDto.from),
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  async findMappingConfigById(
    id: string,
    workspaceId: string,
  ): Promise<MappingConfigResponseDto> {
    const record = await this.findConfigOrFail(id, workspaceId);
    return MappingConfigResponseDto.from(record);
  }

  async publishMappingConfig(
    id: string,
    workspaceId: string,
    dto: PublishMappingConfigDto,
    publishedBy: string,
  ): Promise<MappingConfigResponseDto> {
    const existing = await this.findConfigOrFail(id, workspaceId);
    this.assertStatusTransition(existing['status'] as MappingStatus, MappingStatus.PUBLISHED, 'mapping config');

    const newVersion = (existing['mappingVersion'] as number) + 1;

    const record = await this.repository.updateMappingConfig(id, workspaceId, {
      status: MappingStatus.PUBLISHED,
      mappingVersion: newVersion,
      publishedAt: new Date(),
      publishedBy,
      approvedBy: publishedBy,
    });

    await this.repository.createVersionHistory({
      configId: id,
      workspaceId,
      mappingVersion: newVersion,
      schemaVersion: existing['schemaVersion'] as string,
      status: MappingStatus.PUBLISHED,
      overrides: existing['overrides'] ?? null,
      changeNote: dto.changeNote ?? null,
      createdBy: publishedBy,
      approvedBy: publishedBy,
    });

    await this.eventQueue.enqueue({
      entityId: id,
      workspaceId,
      marketplaceKey: existing['marketplaceKey'] as string,
      event: MarketplaceMappingEvent.MAPPING_PUBLISHED,
      triggeredBy: publishedBy,
    });

    return MappingConfigResponseDto.from(record);
  }

  async rollbackMappingConfig(
    id: string,
    workspaceId: string,
    dto: RollbackMappingConfigDto,
    triggeredBy: string,
  ): Promise<MappingConfigResponseDto> {
    const existing = await this.findConfigOrFail(id, workspaceId);
    const targetHistory = await this.repository.findVersionHistoryByVersion(id, dto.targetVersion);

    if (!targetHistory) {
      throw new NotFoundException(`Version ${dto.targetVersion} not found for config ${id}`);
    }

    const newVersion = (existing['mappingVersion'] as number) + 1;

    const record = await this.repository.updateMappingConfig(id, workspaceId, {
      status: MappingStatus.DRAFT,
      mappingVersion: newVersion,
      overrides: targetHistory['overrides'] ?? null,
      schemaVersion: targetHistory['schemaVersion'],
    });

    await this.repository.createVersionHistory({
      configId: id,
      workspaceId,
      mappingVersion: newVersion,
      schemaVersion: targetHistory['schemaVersion'] as string,
      status: MappingStatus.DRAFT,
      overrides: targetHistory['overrides'] ?? null,
      changeNote: dto.reason ?? `Rollback to version ${dto.targetVersion}`,
      createdBy: triggeredBy,
    });

    await this.eventQueue.enqueue({
      entityId: id,
      workspaceId,
      marketplaceKey: existing['marketplaceKey'] as string,
      event: MarketplaceMappingEvent.MAPPING_UPDATED,
      triggeredBy,
      metadata: { rollbackTo: dto.targetVersion },
    });

    return MappingConfigResponseDto.from(record);
  }

  async getMappingVersionHistory(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    await this.findConfigOrFail(id, workspaceId);
    return this.repository.findVersionHistory(id, workspaceId);
  }

  // ── Transformation ─────────────────────────────────────────

  async transformListing(
    workspaceId: string,
    dto: TransformListingDto,
    triggeredBy: string,
  ): Promise<TransformationJobResponseDto> {
    const marketplaceKey = dto.marketplaceKey.toUpperCase();
    const country = dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY;

    // Prevent duplicate in-flight jobs (non-dry-run)
    if (!dto.dryRun) {
      const existing = await this.repository.findDuplicateInFlightJob(
        dto.listingId,
        workspaceId,
        marketplaceKey,
      );
      if (existing) {
        throw new BadRequestException(
          `${MAPPING_ERROR_CODES.DUPLICATE_IN_FLIGHT}: Transformation already in progress for listing ${dto.listingId}`,
        );
      }
    }

    // Resolve schema
    const schemaRaw = await this.repository.findActiveSchema(
      marketplaceKey,
      country,
      workspaceId,
      undefined,
      dto.schemaVersion,
    );

    if (!schemaRaw) {
      throw new NotFoundException(
        `${MAPPING_ERROR_CODES.SCHEMA_NOT_FOUND}: No published schema found for ${marketplaceKey} / ${country}`,
      );
    }

    const job = await this.repository.createTransformationJob({
      workspaceId,
      listingId: dto.listingId,
      catalogProductId: dto.listingId, // caller can supply catalogProductId separately
      marketplaceKey,
      country,
      schemaVersion: schemaRaw['schemaVersion'] as string,
      status: TransformationStatus.PENDING,
      isDryRun: dto.dryRun ?? false,
      triggeredBy,
    });

    const jobId = job['id'] as string;

    if (dto.dryRun) {
      // Execute synchronously for dry-run
      const result = await this.executeTransformation(workspaceId, {
        jobId,
        listingId: dto.listingId,
        workspaceId,
        catalogProductId: dto.listingId,
        marketplaceKey,
        country,
        schemaVersion: schemaRaw['schemaVersion'] as string,
        isDryRun: true,
        sections: dto.sections,
        workspaceOverrides: dto.workspaceOverrides,
        triggeredBy,
      });
      return TransformationJobResponseDto.from(result);
    }

    // Enqueue for async processing
    await this.transformationQueue.enqueue({
      jobId,
      listingId: dto.listingId,
      workspaceId,
      catalogProductId: dto.listingId,
      marketplaceKey,
      country,
      schemaVersion: schemaRaw['schemaVersion'] as string,
      isDryRun: false,
      sections: dto.sections,
      workspaceOverrides: dto.workspaceOverrides,
      triggeredBy,
    });

    return TransformationJobResponseDto.from(job);
  }

  async executeTransformation(
    workspaceId: string,
    payload: {
      jobId: string;
      listingId: string;
      workspaceId: string;
      catalogProductId: string;
      marketplaceKey: string;
      country: string;
      schemaVersion: string;
      isDryRun: boolean;
      sections?: unknown;
      workspaceOverrides?: Record<string, unknown>;
      triggeredBy?: string;
    },
  ): Promise<Record<string, unknown>> {
    const { jobId } = payload;

    await this.repository.updateTransformationJob(jobId, {
      status: TransformationStatus.PROCESSING,
      startedAt: new Date(),
    });

    await this.eventQueue.enqueue({
      entityId: jobId,
      workspaceId,
      marketplaceKey: payload.marketplaceKey,
      event: MarketplaceMappingEvent.TRANSFORMATION_STARTED,
      triggeredBy: payload.triggeredBy,
    });

    try {
      // Resolve schema
      const schemaRaw = await this.repository.findActiveSchema(
        payload.marketplaceKey,
        payload.country,
        workspaceId,
        undefined,
        payload.schemaVersion,
      );

      if (!schemaRaw) throw new Error('Schema not found during execution');

      const schema = this.rawToSchema(schemaRaw);

      // Load mappings
      const categoryMappingsRaw = await this.repository.findAllCategoryMappingsForResolution(
        payload.marketplaceKey,
        workspaceId,
      );

      const attributeMappingsRaw = await this.repository.findAllAttributeMappingsForResolution(
        payload.marketplaceKey,
        payload.country,
        workspaceId,
      );

      const categoryMappings = categoryMappingsRaw as unknown as ICategoryMapping[];
      const attributeMappings = attributeMappingsRaw as unknown as IAttributeMapping[];

      // Build a minimal universal input (in production, caller supplies full input via DTO)
      const input: UniversalListingInput = {
        listingId: payload.listingId,
        workspaceId,
        catalogProductId: payload.catalogProductId,
        ...(payload.workspaceOverrides as Partial<UniversalListingInput> ?? {}),
      };

      const result = this.factory.createTransformation(
        input,
        schema,
        categoryMappings,
        attributeMappings,
        {
          dryRun: payload.isDryRun,
          workspaceOverrides: payload.workspaceOverrides,
        },
      );

      const finalStatus = result.status === TransformationStatus.FAILED
        ? TransformationStatus.FAILED
        : TransformationStatus.COMPLETED;

      const updated = await this.repository.updateTransformationJob(jobId, {
        status: finalStatus,
        payload: result.payload,
        fieldTrace: result.fieldTrace,
        warnings: result.warnings,
        errors: result.errors,
        completedAt: new Date(),
      });

      await this.eventQueue.enqueue({
        entityId: jobId,
        workspaceId,
        marketplaceKey: payload.marketplaceKey,
        event: MarketplaceMappingEvent.TRANSFORMATION_COMPLETED,
        triggeredBy: payload.triggeredBy,
        metadata: { sectionsTransformed: result.sectionsTransformed.length },
      });

      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Transformation job ${jobId} failed: ${errorMessage}`);

      const updated = await this.repository.updateTransformationJob(jobId, {
        status: TransformationStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });

      await this.eventQueue.enqueue({
        entityId: jobId,
        workspaceId,
        marketplaceKey: payload.marketplaceKey,
        event: MarketplaceMappingEvent.TRANSFORMATION_FAILED,
        triggeredBy: payload.triggeredBy,
      });

      return updated;
    }
  }

  async getTransformationJob(
    id: string,
    workspaceId: string,
  ): Promise<TransformationJobResponseDto> {
    const record = await this.repository.findTransformationJobById(id, workspaceId);
    if (!record) throw new NotFoundException(`Transformation job ${id} not found`);
    return TransformationJobResponseDto.from(record);
  }

  async findTransformationJobs(
    workspaceId: string,
    filter: TransformationJobFilterDto,
  ): Promise<PaginatedResponseDto<TransformationJobResponseDto>> {
    const [items, total] = await this.repository.findTransformationJobs(workspaceId, filter);
    return PaginatedResponseDto.of(
      items.map(TransformationJobResponseDto.from),
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  async validatePayload(
    workspaceId: string,
    dto: ValidateTransformedListingDto,
  ): Promise<unknown> {
    const marketplaceKey = dto.marketplaceKey.toUpperCase();
    const country = dto.country ?? MARKETPLACE_MAPPING_CONSTANTS.DEFAULT_COUNTRY;

    const schemaRaw = await this.repository.findActiveSchema(
      marketplaceKey,
      country,
      workspaceId,
      undefined,
      dto.schemaVersion,
    );

    if (!schemaRaw) {
      throw new NotFoundException(
        `No published schema found for ${marketplaceKey} / ${country}`,
      );
    }

    const schema = this.rawToSchema(schemaRaw);
    const result = this.factory.validate(dto.payload, schema);

    await this.eventQueue.enqueue({
      entityId: dto.marketplaceKey,
      workspaceId,
      marketplaceKey,
      event: MarketplaceMappingEvent.VALIDATION_COMPLETED,
      metadata: { readinessScore: result.readinessScore },
    });

    return result;
  }

  // ── Internal Helpers ──────────────────────────────────────

  private rawToSchema(raw: Record<string, unknown>): IMarketplaceSchema {
    return raw as unknown as IMarketplaceSchema;
  }
}
