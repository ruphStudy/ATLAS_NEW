import { Injectable } from '@nestjs/common';
import { WebhookRepository } from '../repository/webhook.repository';

@Injectable()
export class WebhookMetrics {
  constructor(private readonly repository: WebhookRepository) {}

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.repository.getMetrics(workspaceId, accountId);
  }

  async getDeliveryHistory(
    workspaceId: string,
    webhookConfigId?: string,
    days: number = 7,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.repository.findDeliveries({
      workspaceId,
      webhookConfigId,
      startDate,
      limit: 100,
    });
  }

  async getSuccessRate(workspaceId: string, webhookConfigId?: string): Promise<number> {
    const metrics = await this.repository.getMetrics(workspaceId);
    return metrics.successRate;
  }
}
