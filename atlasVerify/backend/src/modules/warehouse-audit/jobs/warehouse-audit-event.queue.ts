import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface WarehouseAuditEventPayload {
  event: string;
  workspaceId: string;
  warehouseId?: string;
  auditLogId?: string;
  actorType?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  suspicious?: boolean;
  [key: string]: unknown;
}

@Injectable()
export class WarehouseAuditEventQueue {
  private readonly logger = new Logger(WarehouseAuditEventQueue.name);

  constructor(
    @InjectQueue('warehouse-audit-events') private readonly queue: Queue,
  ) {}

  async publish(payload: WarehouseAuditEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      this.logger.debug(`Published audit event: ${payload.event}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish audit event ${payload.event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
