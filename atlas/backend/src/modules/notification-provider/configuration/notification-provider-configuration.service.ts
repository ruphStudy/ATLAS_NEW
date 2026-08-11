import { Injectable, Logger } from '@nestjs/common';
import { NotificationProviderConfigurationRepository } from './notification-provider-configuration.repository';
import { NotificationProviderEventQueue } from '../jobs';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ProviderConfigFilterDto,
  PaginatedProviderConfigResponseDto,
} from '../dto';
import {
  INotificationProviderConfig,
  INotificationProviderConfigHistory,
  NotificationProviderConfigStatus,
  NotificationProviderPersistedEvent,
} from '../interfaces';
import { NOTIFICATION_PROVIDER_CONFIG_TRANSITIONS } from '../constants';
import {
  NotificationProviderConfigNotFoundException,
  NotificationProviderConfigDuplicateException,
  NotificationProviderConfigInvalidTransitionException,
  NotificationProviderConfigHistoryVersionNotFoundException,
} from '../exceptions/notification-provider-persisted.exceptions';

@Injectable()
export class NotificationProviderConfigurationService {
  private readonly logger = new Logger(NotificationProviderConfigurationService.name);

  constructor(
    private readonly repository: NotificationProviderConfigurationRepository,
    private readonly eventQueue: NotificationProviderEventQueue,
  ) {}

  async create(dto: CreateProviderConfigDto): Promise<INotificationProviderConfig> {
    const existing = await this.repository.findConflicting(
      dto.workspaceId,
      dto.providerKey,
      dto.channel,
    );
    if (existing) {
      throw new NotificationProviderConfigDuplicateException(dto.providerKey, dto.channel);
    }

    const config = await this.repository.create({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      channel: dto.channel,
      name: dto.name,
      status: NotificationProviderConfigStatus.ACTIVE,
      priority: dto.priority ?? 0,
      isFallback: dto.isFallback ?? false,
      fallbackProviderKeys: dto.fallbackProviderKeys ?? [],
      version: 1,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      settings: dto.settings ?? {},
      timeoutMs: dto.timeoutMs,
      maxRetryAttempts: dto.maxRetryAttempts,
      retryBackoffMs: dto.retryBackoffMs,
      maxRequestsPerMinute: dto.maxRequestsPerMinute,
      createdBy: dto.createdBy,
    });

    await this.writeHistory(config, 1, undefined, dto.createdBy);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CONFIG_CREATED,
      workspaceId: config.workspaceId,
      providerKey: config.providerKey,
      configId: config.id,
    });

    return config;
  }

  async update(
    id: string,
    dto: UpdateProviderConfigDto,
  ): Promise<INotificationProviderConfig> {
    const existing = await this.findById(id);
    const nextVersion = existing.version + 1;

    const updated = await this.repository.update(id, {
      name: dto.name,
      priority: dto.priority,
      isFallback: dto.isFallback,
      fallbackProviderKeys: dto.fallbackProviderKeys,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      settings: dto.settings,
      timeoutMs: dto.timeoutMs,
      maxRetryAttempts: dto.maxRetryAttempts,
      retryBackoffMs: dto.retryBackoffMs,
      maxRequestsPerMinute: dto.maxRequestsPerMinute,
      version: nextVersion,
      updatedBy: dto.changedBy,
    });

    await this.writeHistory(updated, nextVersion, dto.changeReason, dto.changedBy);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CONFIG_UPDATED,
      workspaceId: updated.workspaceId,
      providerKey: updated.providerKey,
      configId: updated.id,
    });

    return updated;
  }

  async setStatus(
    id: string,
    to: NotificationProviderConfigStatus,
  ): Promise<INotificationProviderConfig> {
    const existing = await this.findById(id);
    const allowed = NOTIFICATION_PROVIDER_CONFIG_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new NotificationProviderConfigInvalidTransitionException(existing.status, to);
    }
    return this.repository.update(id, { status: to });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    await this.repository.softDelete(id);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CONFIG_DELETED,
      workspaceId: existing.workspaceId,
      providerKey: existing.providerKey,
      configId: id,
    });
  }

  async findById(id: string): Promise<INotificationProviderConfig> {
    const config = await this.repository.findById(id);
    if (!config) {
      throw new NotificationProviderConfigNotFoundException(id);
    }
    return config;
  }

  async findAll(filter: ProviderConfigFilterDto): Promise<PaginatedProviderConfigResponseDto> {
    const [data, total] = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findHistory(id: string): Promise<INotificationProviderConfigHistory[]> {
    await this.findById(id);
    return this.repository.findHistory(id);
  }

  async rollback(
    id: string,
    toVersion: number,
    changedBy?: string,
  ): Promise<INotificationProviderConfig> {
    const existing = await this.findById(id);
    const historical = await this.repository.findHistoryByVersion(id, toVersion);
    if (!historical) {
      throw new NotificationProviderConfigHistoryVersionNotFoundException(id, toVersion);
    }

    const snapshot = historical.snapshot as Record<string, unknown>;
    const nextVersion = existing.version + 1;

    const updated = await this.repository.update(id, {
      name: snapshot.name as string,
      priority: snapshot.priority as number,
      isFallback: snapshot.isFallback as boolean,
      fallbackProviderKeys: snapshot.fallbackProviderKeys as string[],
      settings: snapshot.settings,
      timeoutMs: snapshot.timeoutMs as number | undefined,
      maxRetryAttempts: snapshot.maxRetryAttempts as number | undefined,
      retryBackoffMs: snapshot.retryBackoffMs as number | undefined,
      maxRequestsPerMinute: snapshot.maxRequestsPerMinute as number | undefined,
      version: nextVersion,
      updatedBy: changedBy,
    });

    await this.writeHistory(updated, nextVersion, `Rolled back to version ${toVersion}`, changedBy);

    return updated;
  }

  /** Resolves the highest-priority applicable config for a channel, honoring effective dates. */
  async resolveApplicable(
    workspaceId: string,
    channel: string,
    preferredProviderKey?: string,
  ): Promise<INotificationProviderConfig[]> {
    return this.repository.findApplicable(workspaceId, channel, preferredProviderKey);
  }

  private async writeHistory(
    config: INotificationProviderConfig,
    version: number,
    changeReason?: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      await this.repository.createHistory({
        configId: config.id,
        workspaceId: config.workspaceId,
        providerKey: config.providerKey,
        version,
        status: config.status,
        snapshot: config as unknown as Record<string, unknown>,
        changeReason,
        changedBy,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write config history for ${config.id}: ${(error as Error).message}`,
      );
    }
  }
}
