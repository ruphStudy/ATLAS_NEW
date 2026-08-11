import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import {
  INotificationProviderPersistedEventPayload,
  NotificationProviderPersistedEvent,
} from '../interfaces';

/**
 * Consumes persisted-layer lifecycle events (registry/config/credential
 * mutations, delivery status transitions) for observability / downstream
 * consumers. Never logs credential material — only ids and status values.
 */
@Processor(QUEUE_NAMES.NOTIFICATION_PROVIDER_EVENTS)
export class NotificationProviderEventWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationProviderEventWorker.name);

  async process(job: Job<INotificationProviderPersistedEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(`Processing notification-provider event: ${event} for workspace ${workspaceId}`);

    switch (event) {
      case NotificationProviderPersistedEvent.REGISTRY_ENTRY_REGISTERED:
      case NotificationProviderPersistedEvent.REGISTRY_ENTRY_UPDATED:
      case NotificationProviderPersistedEvent.REGISTRY_ENTRY_ENABLED:
      case NotificationProviderPersistedEvent.REGISTRY_ENTRY_DISABLED:
      case NotificationProviderPersistedEvent.REGISTRY_ENTRY_ARCHIVED:
        this.logger.debug(`Registry event: ${event} (${job.data.registryEntryId})`);
        break;
      case NotificationProviderPersistedEvent.CONFIG_CREATED:
      case NotificationProviderPersistedEvent.CONFIG_UPDATED:
      case NotificationProviderPersistedEvent.CONFIG_DELETED:
        this.logger.debug(`Config event: ${event} (${job.data.configId})`);
        break;
      case NotificationProviderPersistedEvent.CREDENTIAL_CREATED:
      case NotificationProviderPersistedEvent.CREDENTIAL_UPDATED:
      case NotificationProviderPersistedEvent.CREDENTIAL_ROTATED:
      case NotificationProviderPersistedEvent.CREDENTIAL_REVOKED:
      case NotificationProviderPersistedEvent.CREDENTIAL_VALIDATION_SUCCEEDED:
      case NotificationProviderPersistedEvent.CREDENTIAL_VALIDATION_FAILED:
        this.logger.debug(`Credential event: ${event} (${job.data.credentialId})`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_QUEUED:
      case NotificationProviderPersistedEvent.DELIVERY_SENT:
      case NotificationProviderPersistedEvent.DELIVERY_DELIVERED:
        this.logger.debug(`Delivery event: ${event} (${job.data.deliveryId})`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_READ:
        this.logger.debug(`Delivery read: ${job.data.deliveryId}`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_OPENED:
        this.logger.debug(`Delivery opened: ${job.data.deliveryId}`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_UNDELIVERED:
        this.logger.warn(`Delivery undelivered: ${job.data.deliveryId}`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_REJECTED:
        this.logger.warn(`Delivery rejected: ${job.data.deliveryId}`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_FAILED:
        this.logger.warn(`Delivery failed: ${job.data.deliveryId}`);
        break;
      case NotificationProviderPersistedEvent.DELIVERY_CANCELLED:
        this.logger.debug(`Delivery cancelled: ${job.data.deliveryId}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
