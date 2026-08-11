import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FBAShipmentEventPayload } from './fba-shipment-event.queue';

@Processor('fba-shipment-events')
export class FBAShipmentEventWorker extends WorkerHost {
  private readonly logger = new Logger(FBAShipmentEventWorker.name);

  async process(job: Job<FBAShipmentEventPayload>): Promise<void> {
    const { event, shipmentId, workspaceId, marketplaceAccountId } = job.data;

    this.logger.log(
      `Processing FBA shipment event: ${event} for shipment ${shipmentId} in workspace ${workspaceId}`,
    );

    // Event processing logic can be added here for integrations, notifications, etc.
    // For now, we just log the event
  }
}
