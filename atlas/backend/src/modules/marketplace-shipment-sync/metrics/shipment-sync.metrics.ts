import { Injectable } from '@nestjs/common';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';
import { SyncJobStatus } from '../interfaces';

export interface ShipmentSyncMetricsSnapshot {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalShipmentsImported: number;
  totalShipmentsUpdated: number;
  totalShipmentsCancelled: number;
  totalShipmentsDelivered: number;
  averageProcessingTimeMs: number;
}

@Injectable()
export class ShipmentSyncMetrics {
  constructor(private readonly repository: ShipmentSyncRepository) {}

  async getSnapshot(workspaceId: string, accountId?: string): Promise<ShipmentSyncMetricsSnapshot> {
    const [jobs] = await this.repository.findJobs({ workspaceId, accountId, limit: 1000 });

    const completed = jobs.filter((j: any) => j.status === SyncJobStatus.COMPLETED);
    const failed = jobs.filter((j: any) => j.status === SyncJobStatus.FAILED);
    const partial = jobs.filter((j: any) => j.status === SyncJobStatus.PARTIAL);

    const totalImported = jobs.reduce((sum: number, j: any) => sum + (j.importedShipments ?? 0), 0);
    const totalUpdated = jobs.reduce((sum: number, j: any) => sum + (j.updatedShipments ?? 0), 0);
    const totalCancelled = jobs.reduce((sum: number, j: any) => sum + (j.cancelledShipments ?? 0), 0);
    const totalDelivered = jobs.reduce((sum: number, j: any) => sum + (j.deliveredShipments ?? 0), 0);

    const processingTimes = jobs
      .filter((j: any) => j.startedAt && j.completedAt)
      .map((j: any) => new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime());

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    return {
      totalJobs: jobs.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      partialJobs: partial.length,
      totalShipmentsImported: totalImported,
      totalShipmentsUpdated: totalUpdated,
      totalShipmentsCancelled: totalCancelled,
      totalShipmentsDelivered: totalDelivered,
      averageProcessingTimeMs: avgProcessingTime,
    };
  }
}
