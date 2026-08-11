import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WarehouseSyncEventPayload } from './warehouse-sync-event.queue';

@Processor('warehouse-sync-events')
export class WarehouseSyncEventWorker extends WorkerHost {
  private readonly logger = new Logger(WarehouseSyncEventWorker.name);

  async process(job: Job<WarehouseSyncEventPayload>): Promise<void> {
    this.logger.log(`Processing warehouse sync event: ${job.name}`);

    const { event, workspaceId } = job.data;

    try {
      switch (event) {
        case 'warehouse-sync.started':
          await this.handleSyncStarted(job.data);
          break;
        case 'warehouse-sync.progressed':
          await this.handleSyncProgressed(job.data);
          break;
        case 'warehouse-sync.completed':
          await this.handleSyncCompleted(job.data);
          break;
        case 'warehouse-sync.failed':
          await this.handleSyncFailed(job.data);
          break;
        case 'warehouse-sync.paused':
          await this.handleSyncPaused(job.data);
          break;
        case 'warehouse-sync.resumed':
          await this.handleSyncResumed(job.data);
          break;
        case 'warehouse-sync.cancelled':
          await this.handleSyncCancelled(job.data);
          break;
        case 'warehouse-sync.conflict_detected':
          await this.handleConflictDetected(job.data);
          break;
        case 'warehouse-sync.conflict_resolved':
          await this.handleConflictResolved(job.data);
          break;
        case 'warehouse-sync.mismatch_detected':
          await this.handleMismatchDetected(job.data);
          break;
        case 'warehouse-sync.stale_data_detected':
          await this.handleStaleDataDetected(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event} for workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleSyncStarted(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.log(
      `Sync job ${payload.syncJobId} started for workspace ${payload.workspaceId}`,
    );
  }

  private async handleSyncProgressed(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.debug(
      `Sync job ${payload.syncJobId} progress: ${payload.progressPercentage}%`,
    );
  }

  private async handleSyncCompleted(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.log(
      `Sync job ${payload.syncJobId} completed for workspace ${payload.workspaceId}`,
    );
  }

  private async handleSyncFailed(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.error(
      `Sync job ${payload.syncJobId} failed: ${payload.errorMessage}`,
    );
  }

  private async handleSyncPaused(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.log(`Sync job ${payload.syncJobId} paused`);
  }

  private async handleSyncResumed(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.log(`Sync job ${payload.syncJobId} resumed`);
  }

  private async handleSyncCancelled(payload: WarehouseSyncEventPayload): Promise<void> {
    this.logger.log(`Sync job ${payload.syncJobId} cancelled`);
  }

  private async handleConflictDetected(
    payload: WarehouseSyncEventPayload,
  ): Promise<void> {
    this.logger.warn(
      `Conflict detected in sync job ${payload.syncJobId} for item ${payload.inventoryItemId}`,
    );
  }

  private async handleConflictResolved(
    payload: WarehouseSyncEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Conflict ${payload.conflictId} resolved in sync job ${payload.syncJobId}`,
    );
  }

  private async handleMismatchDetected(
    payload: WarehouseSyncEventPayload,
  ): Promise<void> {
    this.logger.warn(
      `Mismatch detected in sync job ${payload.syncJobId} for item ${payload.inventoryItemId}`,
    );
  }

  private async handleStaleDataDetected(
    payload: WarehouseSyncEventPayload,
  ): Promise<void> {
    this.logger.warn(
      `Stale data detected in sync job ${payload.syncJobId} for item ${payload.inventoryItemId}`,
    );
  }
}
