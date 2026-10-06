import { Injectable } from '@nestjs/common';
import { PriceSyncRepository } from '../repository/price-sync.repository';

@Injectable()
export class PriceSyncMetrics {
  constructor(private readonly repository: PriceSyncRepository) {}

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.repository.getMetrics(workspaceId, accountId);
  }

  async getSyncHistory(workspaceId: string, accountId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.repository.findJobs({
      workspaceId,
      accountId,
      startDate,
      limit: 100,
    });
  }

  async getConflictRate(workspaceId: string, accountId?: string): Promise<number> {
    const metrics = await this.repository.getMetrics(workspaceId, accountId);
    const total = metrics.totalItemsProcessed;
    return total > 0 ? (metrics.totalConflicts / total) * 100 : 0;
  }

  async getSuccessRate(workspaceId: string, accountId?: string): Promise<number> {
    const metrics = await this.repository.getMetrics(workspaceId, accountId);
    const total = metrics.totalJobs;
    return total > 0 ? (metrics.completedJobs / total) * 100 : 0;
  }
}
