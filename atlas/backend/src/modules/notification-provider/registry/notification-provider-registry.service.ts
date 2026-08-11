import { Injectable } from '@nestjs/common';
import { NotificationProviderRegistryRepository } from './notification-provider-registry.repository';
import { NotificationProviderEventQueue } from '../jobs';
import {
  RegisterRegistryEntryDto,
  UpdateRegistryEntryDto,
  RegistryEntryFilterDto,
  PaginatedRegistryEntryResponseDto,
} from '../dto';
import {
  INotificationProviderRegistryEntry,
  NotificationProviderRegistryStatus,
  NotificationProviderPersistedEvent,
} from '../interfaces';
import { NOTIFICATION_PROVIDER_REGISTRY_TRANSITIONS } from '../constants';
import {
  NotificationProviderRegistryEntryNotFoundException,
  NotificationProviderRegistryEntryDuplicateException,
  NotificationProviderRegistryInvalidTransitionException,
} from '../exceptions/notification-provider-persisted.exceptions';

@Injectable()
export class NotificationProviderRegistryService {
  constructor(
    private readonly repository: NotificationProviderRegistryRepository,
    private readonly eventQueue: NotificationProviderEventQueue,
  ) {}

  async register(dto: RegisterRegistryEntryDto): Promise<INotificationProviderRegistryEntry> {
    const existing = await this.repository.findConflicting(dto.providerKey, dto.workspaceId);
    if (existing) {
      throw new NotificationProviderRegistryEntryDuplicateException(dto.providerKey);
    }

    const entry = await this.repository.create({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      channel: dto.channel,
      displayName: dto.displayName,
      version: dto.version,
      status: NotificationProviderRegistryStatus.PENDING,
      capabilities: dto.capabilities ?? [],
      priority: dto.priority ?? 0,
      isDefault: dto.isDefault ?? false,
      fallbackOrder: dto.fallbackOrder ?? [],
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.REGISTRY_ENTRY_REGISTERED,
      workspaceId: entry.workspaceId ?? 'global',
      providerKey: entry.providerKey,
      registryEntryId: entry.id,
    });

    return entry;
  }

  async update(
    id: string,
    dto: UpdateRegistryEntryDto,
  ): Promise<INotificationProviderRegistryEntry> {
    const existing = await this.findById(id);

    const updated = await this.repository.update(id, {
      displayName: dto.displayName,
      version: dto.version,
      capabilities: dto.capabilities,
      priority: dto.priority,
      isDefault: dto.isDefault,
      fallbackOrder: dto.fallbackOrder,
      metadata: dto.metadata,
      updatedBy: dto.updatedBy,
    });

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.REGISTRY_ENTRY_UPDATED,
      workspaceId: existing.workspaceId ?? 'global',
      providerKey: existing.providerKey,
      registryEntryId: id,
    });

    return updated;
  }

  async enable(id: string): Promise<INotificationProviderRegistryEntry> {
    return this.transition(
      id,
      NotificationProviderRegistryStatus.ACTIVE,
      NotificationProviderPersistedEvent.REGISTRY_ENTRY_ENABLED,
    );
  }

  async disable(id: string): Promise<INotificationProviderRegistryEntry> {
    return this.transition(
      id,
      NotificationProviderRegistryStatus.DISABLED,
      NotificationProviderPersistedEvent.REGISTRY_ENTRY_DISABLED,
    );
  }

  async archive(id: string): Promise<INotificationProviderRegistryEntry> {
    return this.transition(
      id,
      NotificationProviderRegistryStatus.ARCHIVED,
      NotificationProviderPersistedEvent.REGISTRY_ENTRY_ARCHIVED,
    );
  }

  private async transition(
    id: string,
    to: NotificationProviderRegistryStatus,
    event: NotificationProviderPersistedEvent,
  ): Promise<INotificationProviderRegistryEntry> {
    const existing = await this.findById(id);
    const allowed = NOTIFICATION_PROVIDER_REGISTRY_TRANSITIONS[existing.status] ?? [];

    if (!allowed.includes(to)) {
      throw new NotificationProviderRegistryInvalidTransitionException(existing.status, to);
    }

    const updated = await this.repository.update(id, { status: to });

    await this.eventQueue.publish({
      event,
      workspaceId: existing.workspaceId ?? 'global',
      providerKey: existing.providerKey,
      registryEntryId: id,
    });

    return updated;
  }

  async findById(id: string): Promise<INotificationProviderRegistryEntry> {
    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new NotificationProviderRegistryEntryNotFoundException(id);
    }
    return entry;
  }

  async findAll(filter: RegistryEntryFilterDto): Promise<PaginatedRegistryEntryResponseDto> {
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
}
