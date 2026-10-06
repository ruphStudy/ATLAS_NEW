import { Injectable } from '@nestjs/common';
import { EventRepository } from '../repository/event.repository';

@Injectable()
export class EventMetrics {
  constructor(private readonly repository: EventRepository) {}

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.repository.getMetrics(workspaceId, accountId);
  }

  async getEventHistory(eventId: string, workspaceId: string) {
    return this.repository.getEventHistory(eventId, workspaceId);
  }

  async getSuccessRate(workspaceId: string, accountId?: string): Promise<number> {
    const metrics = await this.repository.getMetrics(workspaceId, accountId);
    return metrics.successRate;
  }
}
