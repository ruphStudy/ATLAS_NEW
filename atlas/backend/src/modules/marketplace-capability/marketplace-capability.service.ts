import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CapabilityCategory,
  CapabilityEvent,
  CapabilityFilterOptions,
  CapabilityResolutionRequest,
  CapabilityResolutionResult,
  CapabilityStatus,
  CapabilityValidationRequest,
  CapabilityValidationResult,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
} from '../interfaces';
import { MarketplaceCapabilityRepository } from '../repository/marketplace-capability.repository';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityCache } from '../cache/marketplace-capability.cache';
import { MarketplaceCapabilityValidator } from '../validator/marketplace-capability.validator';
import { MarketplaceCapabilityResolver } from '../resolver/marketplace-capability.resolver';
import { MarketplaceCapabilityVersionManager } from '../version/marketplace-capability-version.manager';
import { MarketplaceCapabilityCompatibilityManager } from '../compatibility/marketplace-capability-compatibility.manager';
import { MarketplaceCapabilityAudit } from '../audit/marketplace-capability.audit';
import { MarketplaceCapabilityEventQueue } from '../events/marketplace-capability-events.queue';
import { MarketplaceCapabilityMetrics } from '../metrics/marketplace-capability.metrics';
import { MP_CAPABILITY_CONSTANTS, MP_CAPABILITY_ERROR_CODES } from '../constants';
import {
  CreateCapabilityDto,
  UpdateCapabilityDto,
  DeclareProviderCapabilityDto,
  UpdateDeclarationDto,
  CapabilityResponseDto,
  DeclarationResponseDto,
  PaginatedCapabilityResponseDto,
  CreateCapabilityOverrideDto,
} from '../dto';

@Injectable()
export class MarketplaceCapabilityService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceCapabilityService.name);

  constructor(
    private readonly repository: MarketplaceCapabilityRepository,
    private readonly registry: MarketplaceCapabilityRegistry,
    private readonly cache: MarketplaceCapabilityCache,
    private readonly validator: MarketplaceCapabilityValidator,
    private readonly resolver: MarketplaceCapabilityResolver,
    private readonly versionManager: MarketplaceCapabilityVersionManager,
    private readonly compatibilityManager: MarketplaceCapabilityCompatibilityManager,
    private readonly audit: MarketplaceCapabilityAudit,
    private readonly eventQueue: MarketplaceCapabilityEventQueue,
    private readonly metrics: MarketplaceCapabilityMetrics,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const [definitions] = await this.repository.findDefinitions({ status: CapabilityStatus.ACTIVE });
      const declarations: IMarketplaceProviderCapabilityDeclaration[] = [];
      // Warm registry
      this.registry.seed(
        definitions as unknown as IMarketplaceCapabilityDefinition[],
        declarations,
      );
      this.logger.log(`Capability registry initialized with ${definitions.length} definitions`);
    } catch (err) {
      this.logger.warn(`Failed to seed capability registry on init: ${(err as Error).message}`);
    }
  }

  // ── Capability CRUD ───────────────────────────────────────

  async createCapability(
    dto: CreateCapabilityDto,
    userId?: string,
  ): Promise<CapabilityResponseDto> {
    const vr = this.validator.validateDefinitionPayload(dto);
    if (!vr.valid) {
      throw new BadRequestException({ message: 'Capability validation failed', errors: vr.errors });
    }

    const existing = await this.repository.findDefinitionByKey(dto.capabilityKey);
    if (existing) {
      throw new ConflictException({
        message: `Capability '${dto.capabilityKey}' already exists`,
        code: MP_CAPABILITY_ERROR_CODES.DUPLICATE,
      });
    }

    const version = 1;
    const raw = await this.repository.createDefinition({
      capabilityKey: dto.capabilityKey.toUpperCase(),
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      status: CapabilityStatus.DRAFT,
      version,
      inputSchema: dto.inputSchema ?? null,
      outputSchema: dto.outputSchema ?? null,
      supportedOperations: dto.supportedOperations ?? [],
      requiredPermissions: dto.requiredPermissions ?? [],
      requiredConfiguration: dto.requiredConfiguration ?? {},
      requiredCredentials: dto.requiredCredentials ?? [],
      requiredProviderVersion: dto.requiredProviderVersion ?? null,
      requiredApiVersion: dto.requiredApiVersion ?? null,
      countryRestrictions: dto.countryRestrictions ?? [],
      regionRestrictions: dto.regionRestrictions ?? [],
      marketplaceRestrictions: dto.marketplaceRestrictions ?? [],
      featureFlags: dto.featureFlags ?? {},
      dependencies: dto.dependencies ?? [],
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const definition = raw as unknown as IMarketplaceCapabilityDefinition;
    this.registry.register(definition);

    await this.audit.logDefinitionChange(definition, 'created', userId);
    await this.publishEvent(CapabilityEvent.CREATED, definition.capabilityKey, null, null, userId);

    return CapabilityResponseDto.from(definition);
  }

  async findAll(filter: CapabilityFilterOptions): Promise<PaginatedCapabilityResponseDto> {
    const [items, total] = await this.repository.findDefinitions(filter);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MP_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: items.map((r) => CapabilityResponseDto.from(r as unknown as IMarketplaceCapabilityDefinition)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CapabilityResponseDto> {
    const raw = await this.repository.findDefinitionById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Capability '${id}' not found`, code: MP_CAPABILITY_ERROR_CODES.NOT_FOUND });
    }
    return CapabilityResponseDto.from(raw as unknown as IMarketplaceCapabilityDefinition);
  }

  async findByKey(capabilityKey: string): Promise<CapabilityResponseDto> {
    const cached = this.cache.getDefinition(capabilityKey);
    if (cached) return CapabilityResponseDto.from(cached);

    const raw = await this.repository.findDefinitionByKey(capabilityKey);
    if (!raw) {
      throw new NotFoundException({ message: `Capability '${capabilityKey}' not found`, code: MP_CAPABILITY_ERROR_CODES.NOT_FOUND });
    }
    const definition = raw as unknown as IMarketplaceCapabilityDefinition;
    this.cache.setDefinition(definition);
    return CapabilityResponseDto.from(definition);
  }

  async updateCapability(
    id: string,
    dto: UpdateCapabilityDto,
    userId?: string,
  ): Promise<CapabilityResponseDto> {
    const existing = await this.requireDefinition(id);
    this.assertMutable(existing);

    const raw = await this.repository.updateDefinition(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.inputSchema !== undefined && { inputSchema: dto.inputSchema }),
      ...(dto.outputSchema !== undefined && { outputSchema: dto.outputSchema }),
      ...(dto.supportedOperations !== undefined && { supportedOperations: dto.supportedOperations }),
      ...(dto.requiredPermissions !== undefined && { requiredPermissions: dto.requiredPermissions }),
      ...(dto.requiredConfiguration !== undefined && { requiredConfiguration: dto.requiredConfiguration }),
      ...(dto.requiredCredentials !== undefined && { requiredCredentials: dto.requiredCredentials }),
      ...(dto.requiredProviderVersion !== undefined && { requiredProviderVersion: dto.requiredProviderVersion }),
      ...(dto.requiredApiVersion !== undefined && { requiredApiVersion: dto.requiredApiVersion }),
      ...(dto.countryRestrictions !== undefined && { countryRestrictions: dto.countryRestrictions }),
      ...(dto.regionRestrictions !== undefined && { regionRestrictions: dto.regionRestrictions }),
      ...(dto.marketplaceRestrictions !== undefined && { marketplaceRestrictions: dto.marketplaceRestrictions }),
      ...(dto.featureFlags !== undefined && { featureFlags: dto.featureFlags }),
      ...(dto.dependencies !== undefined && { dependencies: dto.dependencies }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedBy: userId ?? null,
    });

    const definition = raw as unknown as IMarketplaceCapabilityDefinition;
    this.registry.register(definition);
    this.cache.invalidateDefinition(definition.capabilityKey);

    await this.audit.logDefinitionChange(definition, dto.changeReason ?? 'updated', userId);
    await this.publishEvent(CapabilityEvent.UPDATED, definition.capabilityKey, null, definition.version, userId);

    return CapabilityResponseDto.from(definition);
  }

  async enableCapability(id: string, userId?: string): Promise<CapabilityResponseDto> {
    return this.transition(id, CapabilityStatus.ACTIVE, CapabilityEvent.ENABLED, 'enabled', userId);
  }

  async disableCapability(id: string, userId?: string): Promise<CapabilityResponseDto> {
    return this.transition(id, CapabilityStatus.DISABLED, CapabilityEvent.DISABLED, 'disabled', userId);
  }

  async deprecateCapability(id: string, userId?: string): Promise<CapabilityResponseDto> {
    return this.transition(id, CapabilityStatus.DEPRECATED, CapabilityEvent.DEPRECATED, 'deprecated', userId);
  }

  async archiveCapability(id: string, userId?: string): Promise<CapabilityResponseDto> {
    return this.transition(id, CapabilityStatus.ARCHIVED, CapabilityEvent.ARCHIVED, 'archived', userId);
  }

  async restoreCapability(id: string, userId?: string): Promise<CapabilityResponseDto> {
    return this.transition(id, CapabilityStatus.ACTIVE, CapabilityEvent.ENABLED, 'restored', userId);
  }

  async publishCapabilityVersion(id: string, userId?: string): Promise<CapabilityResponseDto> {
    const existing = await this.requireDefinition(id);
    this.assertMutable(existing);

    const nextVersion = await this.repository.getNextVersion(existing.capabilityKey);
    const raw = await this.repository.updateDefinition(id, {
      version: nextVersion,
      publishedVersion: nextVersion,
      status: CapabilityStatus.ACTIVE,
      updatedBy: userId ?? null,
    });

    const definition = raw as unknown as IMarketplaceCapabilityDefinition;
    this.registry.register(definition);
    this.cache.invalidateDefinition(definition.capabilityKey);

    await this.audit.logDefinitionChange(definition, `version published: v${nextVersion}`, userId);
    await this.publishEvent(CapabilityEvent.VERSION_PUBLISHED, definition.capabilityKey, null, nextVersion, userId);

    return CapabilityResponseDto.from(definition);
  }

  async cloneCapability(id: string, newKey: string, userId?: string): Promise<CapabilityResponseDto> {
    const existing = await this.requireDefinition(id);
    const dto: CreateCapabilityDto = {
      capabilityKey: newKey,
      name: `${existing.name} (copy)`,
      description: existing.description ?? undefined,
      category: existing.category,
      inputSchema: existing.inputSchema ?? undefined,
      outputSchema: existing.outputSchema ?? undefined,
      supportedOperations: existing.supportedOperations,
      requiredPermissions: existing.requiredPermissions,
      requiredConfiguration: existing.requiredConfiguration,
      requiredCredentials: existing.requiredCredentials,
      requiredProviderVersion: existing.requiredProviderVersion ?? undefined,
      requiredApiVersion: existing.requiredApiVersion ?? undefined,
      countryRestrictions: existing.countryRestrictions,
      regionRestrictions: existing.regionRestrictions,
      marketplaceRestrictions: existing.marketplaceRestrictions,
      featureFlags: existing.featureFlags,
      dependencies: existing.dependencies,
      metadata: existing.metadata,
    };
    return this.createCapability(dto, userId);
  }

  async deleteCapability(id: string, userId?: string): Promise<void> {
    const existing = await this.requireDefinition(id);
    this.assertMutable(existing);
    await this.repository.softDeleteDefinition(id, userId);
    this.registry.unregister(existing.capabilityKey);
    this.cache.invalidateDefinition(existing.capabilityKey);
  }

  async getHistory(id: string): Promise<Record<string, unknown>[]> {
    return this.repository.findDefinitionHistory(id);
  }

  // ── Provider Declarations ─────────────────────────────────

  async declareProviderCapability(
    dto: DeclareProviderCapabilityDto,
    userId?: string,
  ): Promise<DeclarationResponseDto> {
    // Capability must exist
    const definition = await this.repository.findDefinitionByKey(dto.capabilityKey);
    if (!definition) {
      throw new NotFoundException({ message: `Capability '${dto.capabilityKey}' not found` });
    }

    const raw = await this.repository.upsertDeclaration({
      providerKey: dto.providerKey.toUpperCase(),
      capabilityKey: dto.capabilityKey.toUpperCase(),
      workspaceId: dto.workspaceId ?? null,
      marketplaceKey: dto.marketplaceKey ?? null,
      accountId: dto.accountId ?? null,
      supportLevel: dto.supportLevel,
      supportedOperations: dto.supportedOperations ?? [],
      countryAvailability: dto.countryAvailability ?? [],
      regionAvailability: dto.regionAvailability ?? [],
      marketplaceAvailability: dto.marketplaceAvailability ?? [],
      accountAvailability: dto.accountAvailability ?? [],
      limitations: dto.limitations ?? {},
      rateLimits: dto.rateLimits ?? {},
      batchLimits: dto.batchLimits ?? {},
      featureRestrictions: dto.featureRestrictions ?? {},
      providerMetadata: dto.providerMetadata ?? {},
      capabilityVersion: dto.capabilityVersion ?? null,
      providerVersion: dto.providerVersion ?? null,
      apiVersion: dto.apiVersion ?? null,
      status: CapabilityStatus.ACTIVE,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const declaration = raw as unknown as IMarketplaceProviderCapabilityDeclaration;
    this.registry.declareProviderCapability(declaration);
    this.cache.invalidateDeclarationsByProvider(dto.providerKey);

    await this.publishEvent(CapabilityEvent.PROVIDER_CAPABILITY_DECLARED, dto.capabilityKey, dto.providerKey, null, userId);

    return DeclarationResponseDto.from(declaration);
  }

  async updateDeclaration(
    id: string,
    dto: UpdateDeclarationDto,
    userId?: string,
  ): Promise<DeclarationResponseDto> {
    const raw = await this.repository.updateDeclaration(id, {
      ...(dto.supportLevel !== undefined && { supportLevel: dto.supportLevel }),
      ...(dto.supportedOperations !== undefined && { supportedOperations: dto.supportedOperations }),
      ...(dto.countryAvailability !== undefined && { countryAvailability: dto.countryAvailability }),
      ...(dto.regionAvailability !== undefined && { regionAvailability: dto.regionAvailability }),
      ...(dto.limitations !== undefined && { limitations: dto.limitations }),
      ...(dto.rateLimits !== undefined && { rateLimits: dto.rateLimits }),
      ...(dto.batchLimits !== undefined && { batchLimits: dto.batchLimits }),
      ...(dto.featureRestrictions !== undefined && { featureRestrictions: dto.featureRestrictions }),
      ...(dto.providerMetadata !== undefined && { providerMetadata: dto.providerMetadata }),
      ...(dto.capabilityVersion !== undefined && { capabilityVersion: dto.capabilityVersion }),
      ...(dto.providerVersion !== undefined && { providerVersion: dto.providerVersion }),
      ...(dto.apiVersion !== undefined && { apiVersion: dto.apiVersion }),
      updatedBy: userId ?? null,
    });

    const declaration = raw as unknown as IMarketplaceProviderCapabilityDeclaration;
    this.registry.declareProviderCapability(declaration);
    this.cache.invalidateDeclarationsByProvider(declaration.providerKey);

    await this.publishEvent(CapabilityEvent.PROVIDER_CAPABILITY_UPDATED, declaration.capabilityKey, declaration.providerKey, null, userId);

    return DeclarationResponseDto.from(declaration);
  }

  // ── Resolution ────────────────────────────────────────────

  async resolveCapability(request: CapabilityResolutionRequest): Promise<CapabilityResolutionResult> {
    return this.resolver.resolve(request);
  }

  // ── Validation ────────────────────────────────────────────

  async validateCapability(request: CapabilityValidationRequest): Promise<CapabilityValidationResult> {
    const definition = this.registry.getDefinition(request.capabilityKey) ??
      (await this.repository.findDefinitionByKey(request.capabilityKey) as unknown as IMarketplaceCapabilityDefinition | null);

    const declaration = this.registry.getDeclaration(
      request.providerKey,
      request.capabilityKey,
      request.workspaceId ?? null,
      request.accountId ?? null,
    ) ?? (await this.repository.findDeclaration(
      request.providerKey,
      request.capabilityKey,
      request.workspaceId ?? null,
      request.accountId ?? null,
      request.marketplaceKey ?? null,
    ) as unknown as IMarketplaceProviderCapabilityDeclaration | null);

    const result = this.validator.validate(request, definition, declaration);

    if (result.valid) {
      this.metrics.recordValidationSuccess(request.capabilityKey);
    } else {
      this.metrics.recordValidationFailure(request.capabilityKey);
    }

    return result;
  }

  // ── Overrides ─────────────────────────────────────────────

  async createOverride(
    dto: CreateCapabilityOverrideDto,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    const raw = await this.repository.createOverride({
      workspaceId: dto.workspaceId ?? null,
      providerKey: dto.providerKey ? dto.providerKey.toUpperCase() : null,
      capabilityKey: dto.capabilityKey.toUpperCase(),
      accountId: dto.accountId ?? null,
      marketplaceKey: dto.marketplaceKey ?? null,
      country: dto.country ?? null,
      region: dto.region ?? null,
      featureFlag: dto.featureFlag ?? null,
      overrideType: dto.overrideType,
      overrideValue: dto.overrideValue,
      priority: dto.priority ?? 0,
      reason: dto.reason ?? null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });
    this.cache.invalidateDefinition(dto.capabilityKey);
    return raw;
  }

  // ── Discovery ─────────────────────────────────────────────

  async discoverCapabilities(request: {
    providerKey?: string | null;
    workspaceId?: string | null;
    accountId?: string | null;
    country?: string | null;
    region?: string | null;
    category?: CapabilityCategory | null;
  }): Promise<string[]> {
    if (request.providerKey) {
      return this.registry.getSupportedCapabilitiesForProvider(request.providerKey, request.workspaceId);
    }
    return this.registry.getActiveDefinitions().map((d) => d.capabilityKey);
  }

  // ── Cache Invalidation ────────────────────────────────────

  async invalidateCache(capabilityKey?: string, workspaceId?: string): Promise<void> {
    if (capabilityKey) {
      this.cache.invalidateDefinition(capabilityKey);
    } else {
      this.cache.flush();
    }
    if (workspaceId) {
      this.cache.invalidateResolutionsByWorkspace(workspaceId);
    }

    await this.publishEvent(
      CapabilityEvent.CACHE_INVALIDATED,
      capabilityKey ?? '*',
      null,
      null,
      undefined,
      { workspaceId },
    );
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(capabilityKey?: string) {
    return capabilityKey
      ? this.metrics.getForCapability(capabilityKey)
      : this.metrics.getAggregate();
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireDefinition(id: string): Promise<IMarketplaceCapabilityDefinition> {
    const raw = await this.repository.findDefinitionById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Capability '${id}' not found`, code: MP_CAPABILITY_ERROR_CODES.NOT_FOUND });
    }
    return raw as unknown as IMarketplaceCapabilityDefinition;
  }

  private assertMutable(definition: IMarketplaceCapabilityDefinition): void {
    if (!MP_CAPABILITY_CONSTANTS.MUTABLE_STATUSES.has(definition.status)) {
      throw new BadRequestException({
        message: `Capability '${definition.capabilityKey}' cannot be modified in status '${definition.status}'`,
        code: MP_CAPABILITY_ERROR_CODES.IMMUTABLE,
      });
    }
  }

  private assertTransition(from: CapabilityStatus, to: CapabilityStatus): void {
    const allowed = MP_CAPABILITY_CONSTANTS.ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition capability from '${from}' to '${to}'`,
        code: MP_CAPABILITY_ERROR_CODES.INVALID_TRANSITION,
      });
    }
  }

  private async transition(
    id: string,
    to: CapabilityStatus,
    event: CapabilityEvent,
    reason: string,
    userId?: string,
  ): Promise<CapabilityResponseDto> {
    const existing = await this.requireDefinition(id);
    this.assertTransition(existing.status, to);

    const raw = await this.repository.updateDefinition(id, { status: to, updatedBy: userId ?? null });
    const definition = raw as unknown as IMarketplaceCapabilityDefinition;
    this.registry.register(definition);
    this.cache.invalidateDefinition(definition.capabilityKey);

    await this.audit.logDefinitionChange(definition, reason, userId);
    await this.publishEvent(event, definition.capabilityKey, null, definition.version, userId);

    return CapabilityResponseDto.from(definition);
  }

  private async publishEvent(
    event: CapabilityEvent,
    capabilityKey: string,
    providerKey?: string | null,
    version?: number | null,
    changedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      capabilityKey,
      providerKey: providerKey ?? null,
      version: version ?? null,
      workspaceId: null,
      changedBy: changedBy ?? null,
      metadata,
      timestamp: new Date(),
    });
  }
}
