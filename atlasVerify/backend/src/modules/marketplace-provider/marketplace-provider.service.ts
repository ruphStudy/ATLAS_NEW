import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import {
  MarketplaceAccountStatus,
  MarketplaceCapability,
  MarketplaceCredentialEncryption,
  MarketplaceCredentials,
  MarketplaceCredentialType,
  MarketplaceKey,
  MarketplaceProviderEvent,
  MarketplaceProviderResolveOptions,
} from './interfaces';
import { MarketplaceProviderRegistry } from './registry/marketplace-provider.registry';
import { MarketplaceProviderManager } from './manager/marketplace-provider.manager';
import { MarketplaceHealthMonitor } from './health/marketplace-health.monitor';
import { MarketplaceCredentialService } from './credentials/marketplace-credential.service';
import { MarketplaceCapabilityValidator } from './capability/marketplace-capability.validator';
import { MarketplaceVersionManager } from './version/marketplace-version.manager';
import { MarketplaceMetricsRecorder } from './metrics/marketplace-metrics.recorder';
import { MarketplaceProviderRepository } from './marketplace-provider.repository';
import { MarketplaceProviderEventQueue } from './jobs/marketplace-provider-events.queue';
import {
  CreateMarketplaceAccountDto,
  MarketplaceAccountResponseDto,
  MarketplaceProviderConfigResponseDto,
  MarketplaceProviderMetadataResponseDto,
  SetCredentialsDto,
  UpdateMarketplaceAccountDto,
  UpsertMarketplaceProviderConfigDto,
} from './dto';

const MARKETPLACE_PROVIDER_MODULE = 'marketplace-provider';

@Injectable()
export class MarketplaceProviderService {
  private readonly logger = new Logger(MarketplaceProviderService.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly manager: MarketplaceProviderManager,
    private readonly healthMonitor: MarketplaceHealthMonitor,
    private readonly credentialService: MarketplaceCredentialService,
    private readonly capabilityValidator: MarketplaceCapabilityValidator,
    private readonly versionManager: MarketplaceVersionManager,
    private readonly metricsRecorder: MarketplaceMetricsRecorder,
    private readonly repository: MarketplaceProviderRepository,
    private readonly eventQueue: MarketplaceProviderEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Provider Metadata ─────────────────────────────────────────

  listProviders(workspaceId: string): MarketplaceProviderMetadataResponseDto[] {
    return this.registry.getAll().map((adapter) => ({
      providerKey: adapter.metadata.providerKey,
      displayName: adapter.metadata.displayName,
      description: adapter.metadata.description,
      version: this.versionManager.formatVersion(adapter.metadata.version),
      supportedCountries: adapter.metadata.supportedCountries,
      supportedCapabilities: adapter.metadata.supportedCapabilities,
      supportedMarketplaces: adapter.metadata.supportedMarketplaces,
      isRegistered: true,
      isActive: this.registry.isActive(adapter.metadata.providerKey),
    }));
  }

  getProvider(providerKey: string): MarketplaceProviderMetadataResponseDto {
    if (!this.registry.isRegistered(providerKey)) {
      throw new NotFoundException(`Marketplace provider '${providerKey}' is not registered`);
    }
    const adapter = this.registry.get(providerKey);
    return {
      providerKey: adapter.metadata.providerKey,
      displayName: adapter.metadata.displayName,
      description: adapter.metadata.description,
      version: this.versionManager.formatVersion(adapter.metadata.version),
      supportedCountries: adapter.metadata.supportedCountries,
      supportedCapabilities: adapter.metadata.supportedCapabilities,
      supportedMarketplaces: adapter.metadata.supportedMarketplaces,
      isRegistered: true,
      isActive: this.registry.isActive(providerKey),
    };
  }

  // ── Provider Config ───────────────────────────────────────────

  async upsertConfig(
    workspaceId: string,
    dto: UpsertMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    if (!this.registry.isRegistered(dto.providerKey)) {
      throw new BadRequestException(`Provider '${dto.providerKey}' is not registered`);
    }

    const raw = await this.repository.upsertConfig({
      workspaceId,
      ...dto,
      createdBy: userId,
    });

    await this.recordAudit(workspaceId, 'marketplace_provider.config_upserted', dto.providerKey, userId, {
      accountId: dto.accountId,
      isEnabled: dto.isEnabled,
      priority: dto.priority,
    });

    return MarketplaceProviderConfigResponseDto.from(raw as Record<string, unknown>);
  }

  async getConfigs(workspaceId: string, providerKey?: string): Promise<MarketplaceProviderConfigResponseDto[]> {
    const raws = await this.repository.findConfigs(workspaceId, providerKey);
    return raws.map((r) => MarketplaceProviderConfigResponseDto.from(r as Record<string, unknown>));
  }

  async getConfigById(id: string, workspaceId: string): Promise<MarketplaceProviderConfigResponseDto> {
    const raw = await this.repository.findConfigById(id, workspaceId);
    if (!raw) throw new NotFoundException(`Provider config '${id}' not found`);
    return MarketplaceProviderConfigResponseDto.from(raw as Record<string, unknown>);
  }

  async enableProvider(providerKey: string, workspaceId: string, userId?: string): Promise<void> {
    await this.manager.enableProvider(providerKey, workspaceId);
    await this.recordAudit(workspaceId, 'marketplace_provider.enabled', providerKey, userId);
  }

  async disableProvider(providerKey: string, workspaceId: string, userId?: string): Promise<void> {
    await this.manager.disableProvider(providerKey, workspaceId);
    await this.recordAudit(workspaceId, 'marketplace_provider.disabled', providerKey, userId);
  }

  async deleteConfig(id: string, workspaceId: string, userId?: string): Promise<void> {
    const existing = await this.repository.findConfigById(id, workspaceId);
    await this.repository.softDeleteConfig(id, workspaceId);
    await this.recordAudit(
      workspaceId,
      'marketplace_provider.config_deleted',
      (existing?.['providerKey'] as string) ?? 'UNKNOWN',
      userId,
      { configId: id },
    );
  }

  // ── Credentials ───────────────────────────────────────────────

  async setCredentials(
    workspaceId: string,
    dto: SetCredentialsDto,
    userId?: string,
  ): Promise<void> {
    if (!this.registry.isRegistered(dto.providerKey)) {
      throw new BadRequestException(`Provider '${dto.providerKey}' is not registered`);
    }

    const encrypted = this.credentialService.encryptFields(
      dto.fields,
      workspaceId,
      dto.providerKey,
    );

    // Store each field encrypted — pack as JSON string for the single encryptedCredentials column
    const packed = JSON.stringify(encrypted);
    const encryptedPacked = this.credentialService.encrypt(packed, workspaceId, dto.providerKey);

    await this.repository.upsertConfig({
      workspaceId,
      providerKey: dto.providerKey,
      accountId: dto.accountId,
      encryptedCredentials: encryptedPacked,
      credentialType: dto.credentialType,
      credentialValidatedAt: null,
      createdBy: userId,
    });

    this.logger.log(`Credentials stored for provider '${dto.providerKey}' workspace '${workspaceId}'`);

    await this.recordAudit(workspaceId, 'marketplace_provider.credentials_authorized', dto.providerKey, userId, {
      accountId: dto.accountId,
      credentialType: dto.credentialType,
    });
  }

  async validateCredentials(
    workspaceId: string,
    providerKey: string,
    accountId?: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.repository.findActiveConfig(workspaceId, providerKey, accountId);
    if (!config?.encryptedCredentials) {
      return { valid: false, errors: ['No credentials configured'] };
    }

    const adapter = this.registry.get(providerKey);
    const requiredKeys = adapter.metadata.credentialFields
      .filter((f) => f.required)
      .map((f) => f.key);

    let decryptedPacked: string;
    try {
      decryptedPacked = this.credentialService.decrypt(
        config.encryptedCredentials,
        workspaceId,
        providerKey,
      );
    } catch {
      return { valid: false, errors: ['Failed to decrypt credentials'] };
    }

    const fields = JSON.parse(decryptedPacked) as Record<string, string>;
    const decryptedFields = this.credentialService.decryptCredentials({
      workspaceId,
      providerKey,
      accountId: accountId ?? null,
      credentialType: (config.credentialType as MarketplaceCredentialType) ?? MarketplaceCredentialType.API_KEY,
      encryptionAlgorithm: MarketplaceCredentialEncryption.AES_256_GCM,
      fields,
    });

    const { valid, missing } = this.credentialService.validateRequiredFields(decryptedFields, requiredKeys);

    if (valid) {
      await this.repository.updateConfig(config.id, workspaceId, {
        credentialValidatedAt: new Date(),
      });
    }

    return {
      valid,
      errors: valid ? [] : [`Missing required credential fields: ${missing.join(', ')}`],
    };
  }

  // ── Accounts ──────────────────────────────────────────────────

  async createAccount(
    workspaceId: string,
    dto: CreateMarketplaceAccountDto,
    userId?: string,
  ): Promise<MarketplaceAccountResponseDto> {
    if (!this.registry.isRegistered(dto.providerKey)) {
      throw new BadRequestException(`Provider '${dto.providerKey}' is not registered`);
    }

    const raw = await this.repository.createAccount({ workspaceId, ...dto, createdBy: userId });
    return MarketplaceAccountResponseDto.from(raw);
  }

  async getAccounts(workspaceId: string, providerKey?: string): Promise<MarketplaceAccountResponseDto[]> {
    const raws = await this.repository.findAccounts(workspaceId, providerKey);
    return raws.map((r) => MarketplaceAccountResponseDto.from(r));
  }

  async getAccountById(id: string, workspaceId: string): Promise<MarketplaceAccountResponseDto> {
    const raw = await this.repository.findAccountById(id, workspaceId);
    if (!raw) throw new NotFoundException(`Marketplace account '${id}' not found`);
    return MarketplaceAccountResponseDto.from(raw);
  }

  async updateAccount(
    id: string,
    workspaceId: string,
    dto: UpdateMarketplaceAccountDto,
  ): Promise<MarketplaceAccountResponseDto> {
    await this.getAccountById(id, workspaceId);
    const raw = await this.repository.updateAccount(id, workspaceId, dto as Record<string, unknown>);
    return MarketplaceAccountResponseDto.from(raw);
  }

  async deleteAccount(id: string, workspaceId: string): Promise<void> {
    await this.repository.softDeleteAccount(id, workspaceId);
  }

  // ── Health ────────────────────────────────────────────────────

  async checkHealth(providerKey?: string, accountId?: string) {
    if (providerKey) {
      return this.manager.checkHealth(providerKey, accountId);
    }
    return this.healthMonitor.checkAll();
  }

  getHealthStatus(providerKey: string, accountId?: string) {
    return this.manager.getHealth(providerKey, accountId);
  }

  getAllHealthStatuses() {
    return this.manager.getAllHealth();
  }

  // ── Connection Test ───────────────────────────────────────────

  async testConnection(
    workspaceId: string,
    providerKey: string,
    accountId: string,
  ) {
    const config = await this.repository.findActiveConfig(workspaceId, providerKey, accountId);
    if (!config?.encryptedCredentials) {
      throw new BadRequestException('No credentials configured for this provider account');
    }

    const decryptedPacked = this.credentialService.decrypt(
      config.encryptedCredentials,
      workspaceId,
      providerKey,
    );

    const fields = JSON.parse(decryptedPacked) as Record<string, string>;
    const decryptedFields = this.credentialService.decryptCredentials({
      workspaceId,
      providerKey,
      accountId,
      credentialType: (config.credentialType as MarketplaceCredentialType) ?? MarketplaceCredentialType.API_KEY,
      encryptionAlgorithm: MarketplaceCredentialEncryption.AES_256_GCM,
      fields,
    });

    const credentials: MarketplaceCredentials = {
      workspaceId,
      providerKey,
      accountId,
      credentialType: (config.credentialType as MarketplaceCredentialType) ?? MarketplaceCredentialType.API_KEY,
      encryptionAlgorithm: MarketplaceCredentialEncryption.NONE,
      fields: decryptedFields,
      expiresAt: config.credentialExpiresAt ?? null,
    };

    return this.manager.testConnection(providerKey, workspaceId, accountId, credentials);
  }

  // ── Capability Queries ────────────────────────────────────────

  listCapableProviders(capability: MarketplaceCapability) {
    return this.registry.getCapable(capability).map((a) => ({
      providerKey: a.metadata.providerKey,
      displayName: a.metadata.displayName,
    }));
  }

  validateCapability(providerKey: string, capability: MarketplaceCapability) {
    if (!this.registry.isRegistered(providerKey)) {
      throw new NotFoundException(`Provider '${providerKey}' is not registered`);
    }
    const adapter = this.registry.get(providerKey);
    return this.capabilityValidator.validate(adapter, capability);
  }

  // ── Metrics ───────────────────────────────────────────────────

  getMetrics(providerKey?: string) {
    if (providerKey) return this.metricsRecorder.get(providerKey);
    return this.metricsRecorder.getAll();
  }

  // ── Audit ────────────────────────────────────────────────────

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger
   * for Amazon (and other marketplace) provider registration/config/
   * credential lifecycle actions. Never includes encrypted/plain-text
   * credential values.
   */
  private async recordAudit(
    workspaceId: string,
    action: string,
    providerKey: string,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: MARKETPLACE_PROVIDER_MODULE,
        entityType: 'MarketplaceProvider',
        entityId: providerKey,
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
