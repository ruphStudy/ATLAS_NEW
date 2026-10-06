import { Injectable } from '@nestjs/common';
import { QueueManager } from '../manager/queue.manager';
import { QueueManagerRepository } from '../repository/queue-manager.repository';
import { QueueType, JobState, ErrorSummary } from '../interfaces';

export interface AggregatedQueueMetrics {
  queueType: QueueType;
  totalJobs: number;
  waitingJobs: number;
  activeJobs: number;
  delayedJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  throughput?: number;
  errorRate: number;
  healthScore: number;
}

@Injectable()
export class QueueMetricsService {
  constructor(
    private readonly queueManager: QueueManager,
    private readonly repository: QueueManagerRepository,
  ) {}

  async getAggregatedMetrics(
    workspaceId: string,
    queueType: QueueType,
  ): Promise<AggregatedQueueMetrics> {
    const [
      waiting,
      active,
      delayed,
      completed,
      failed,
      cancelled,
      queueMetrics,
    ] = await Promise.all([
      this.repository.countJobsByState(workspaceId, queueType, JobState.WAITING),
      this.repository.countJobsByState(workspaceId, queueType, JobState.ACTIVE),
      this.repository.countJobsByState(workspaceId, queueType, JobState.DELAYED),
      this.repository.countJobsByState(workspaceId, queueType, JobState.COMPLETED),
      this.repository.countJobsByState(workspaceId, queueType, JobState.FAILED),
      this.repository.countJobsByState(workspaceId, queueType, JobState.CANCELLED),
      this.queueManager.getQueueMetrics(queueType),
    ]);

    const totalJobs = waiting + active + delayed + completed + failed + cancelled;
    const errorRate = totalJobs > 0 ? (failed / totalJobs) * 100 : 0;

    return {
      queueType,
      totalJobs,
      waitingJobs: waiting,
      activeJobs: active,
      delayedJobs: delayed,
      completedJobs: completed,
      failedJobs: failed,
      cancelledJobs: cancelled,
      avgProcessingTime: queueMetrics?.avgProcessingTime,
      avgWaitTime: queueMetrics?.avgWaitTime,
      throughput: queueMetrics?.throughput,
      errorRate,
      healthScore: queueMetrics?.healthScore || 0,
    };
  }

  async getAllMetrics(workspaceId: string): Promise<AggregatedQueueMetrics[]> {
    const metrics: AggregatedQueueMetrics[] = [];

    for (const queueType of Object.values(QueueType)) {
      const queueMetrics = await this.getAggregatedMetrics(
        workspaceId,
        queueType as QueueType,
      );
      metrics.push(queueMetrics);
    }

    return metrics;
  }

  async getErrorSummary(
    workspaceId: string,
    queueType: QueueType,
    startDate: Date,
    endDate: Date,
  ): Promise<ErrorSummary[]> {
    const aggregatedErrors = await this.repository.aggregateErrorsByType(
      workspaceId,
      queueType,
      startDate,
      endDate,
    );

    return aggregatedErrors.map((error) => ({
      errorType: error.type,
      errorMessage: error.message,
      count: error.count,
      firstOccurrence: error.firstOccurrence,
      lastOccurrence: error.lastOccurrence,
      affectedJobs: error.jobs,
      isRecoverable: this.isRecoverableError(error.type),
    }));
  }

  private isRecoverableError(errorType: string): boolean {
    const recoverableErrors = [
      'TIMEOUT',
      'RATE_LIMITED',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
    ];
    return recoverableErrors.includes(errorType);
  }
}
