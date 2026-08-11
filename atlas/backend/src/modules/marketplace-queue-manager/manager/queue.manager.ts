import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueManagerRepository } from '../repository/queue-manager.repository';
import {
  QueueType,
  QueueStatus,
  IQueueConfig,
  IQueueMetrics,
  IQueueHealth,
  QueueOperationResult,
} from '../interfaces';

@Injectable()
export class QueueManager implements OnModuleInit {
  private queues: Map<QueueType, Queue> = new Map();

  constructor(
    private readonly repository: QueueManagerRepository,
    @InjectQueue('marketplace-catalog-sync-jobs')
    private readonly catalogSyncQueue: Queue,
    @InjectQueue('marketplace-inventory-sync-jobs')
    private readonly inventorySyncQueue: Queue,
    @InjectQueue('marketplace-listing-sync-jobs')
    private readonly listingSyncQueue: Queue,
    @InjectQueue('marketplace-order-sync-jobs')
    private readonly orderSyncQueue: Queue,
    @InjectQueue('marketplace-shipment-sync-jobs')
    private readonly shipmentSyncQueue: Queue,
    @InjectQueue('marketplace-return-sync-jobs')
    private readonly returnSyncQueue: Queue,
    @InjectQueue('marketplace-pricing-sync-jobs')
    private readonly pricingSyncQueue: Queue,
    @InjectQueue('marketplace-report-sync-jobs')
    private readonly reportSyncQueue: Queue,
    @InjectQueue('marketplace-webhook-processing')
    private readonly webhookProcessingQueue: Queue,
    @InjectQueue('marketplace-event-processing')
    private readonly eventProcessingQueue: Queue,
  ) {}

  async onModuleInit() {
    this.queues.set(QueueType.CATALOG_SYNC, this.catalogSyncQueue);
    this.queues.set(QueueType.INVENTORY_SYNC, this.inventorySyncQueue);
    this.queues.set(QueueType.LISTING_SYNC, this.listingSyncQueue);
    this.queues.set(QueueType.ORDER_SYNC, this.orderSyncQueue);
    this.queues.set(QueueType.SHIPMENT_SYNC, this.shipmentSyncQueue);
    this.queues.set(QueueType.RETURN_SYNC, this.returnSyncQueue);
    this.queues.set(QueueType.PRICING_SYNC, this.pricingSyncQueue);
    this.queues.set(QueueType.REPORT_SYNC, this.reportSyncQueue);
    this.queues.set(QueueType.WEBHOOK_PROCESSING, this.webhookProcessingQueue);
    this.queues.set(QueueType.EVENT_PROCESSING, this.eventProcessingQueue);

    await this.registerQueues();
  }

  async registerQueues(): Promise<void> {
    for (const [queueType, queue] of this.queues.entries()) {
      const existingConfig = await this.repository.findQueueConfig(queue.name);
      if (!existingConfig) {
        await this.repository.createQueueConfig({
          queueName: queue.name,
          queueType,
          concurrency: 5,
          enableMetrics: true,
          enableDeadLetter: true,
        });
      }
    }
  }

  getQueue(queueType: QueueType): Queue | undefined {
    return this.queues.get(queueType);
  }

  async pauseQueue(queueType: QueueType): Promise<QueueOperationResult> {
    const queue = this.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    await queue.pause();

    return {
      success: true,
      message: `Queue ${queueType} paused successfully`,
      queueName: queue.name,
    };
  }

  async resumeQueue(queueType: QueueType): Promise<QueueOperationResult> {
    const queue = this.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    await queue.resume();

    return {
      success: true,
      message: `Queue ${queueType} resumed successfully`,
      queueName: queue.name,
    };
  }

  async drainQueue(
    queueType: QueueType,
    delayed: boolean = false,
  ): Promise<QueueOperationResult> {
    const queue = this.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    await queue.drain(delayed);

    return {
      success: true,
      message: `Queue ${queueType} drained successfully`,
      queueName: queue.name,
    };
  }

  async cleanQueue(
    queueType: QueueType,
    grace: number,
    limit: number,
    type: 'completed' | 'failed',
  ): Promise<QueueOperationResult> {
    const queue = this.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    const jobs = await queue.clean(grace, limit, type);

    return {
      success: true,
      message: `Cleaned ${jobs.length} ${type} jobs from ${queueType}`,
      queueName: queue.name,
      metadata: { cleanedCount: jobs.length },
    };
  }

  async getQueueMetrics(queueType: QueueType): Promise<IQueueMetrics | null> {
    const queue = this.getQueue(queueType);
    if (!queue) return null;

    try {
      const [counts, isPaused, completedJobs] = await Promise.all([
        queue.getJobCounts(),
        queue.isPaused(),
        queue.getCompleted(0, 100),
      ]);

      const avgProcessingTime = this.calculateAvgProcessingTime(completedJobs);
      const avgWaitTime = this.calculateAvgWaitTime(completedJobs);
      const throughput = this.calculateThroughput(completedJobs);
      const errorRate = this.calculateErrorRate(counts);
      const healthScore = this.calculateHealthScore(counts, isPaused);

      const lastJob = completedJobs[0];

      return {
        queueName: queue.name,
        queueType,
        status: this.determineQueueStatus(isPaused, counts),
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        delayed: counts.delayed || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        paused: counts.paused || 0,
        isPaused,
        throughput,
        avgProcessingTime,
        avgWaitTime,
        errorRate,
        lastJobAt: lastJob?.finishedOn
          ? new Date(lastJob.finishedOn)
          : undefined,
        healthScore,
      };
    } catch (error) {
      return null;
    }
  }

  async getQueueHealth(queueType: QueueType): Promise<IQueueHealth | null> {
    const metrics = await this.getQueueMetrics(queueType);
    if (!metrics) return null;

    const issues: string[] = [];
    let isHealthy = true;

    if (metrics.isPaused) {
      issues.push('Queue is paused');
      isHealthy = false;
    }

    if (metrics.waiting > 1000) {
      issues.push(`High number of waiting jobs: ${metrics.waiting}`);
      isHealthy = false;
    }

    if (metrics.errorRate && metrics.errorRate > 50) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
      isHealthy = false;
    }

    if (metrics.active === 0 && metrics.waiting > 0) {
      issues.push('No active jobs despite waiting jobs');
      isHealthy = false;
    }

    if (metrics.healthScore < 50) {
      isHealthy = false;
    }

    return {
      queueName: metrics.queueName,
      isHealthy,
      status: metrics.status,
      issues,
      metrics,
      checkedAt: new Date(),
    };
  }

  async getAllQueueMetrics(): Promise<IQueueMetrics[]> {
    const metrics: IQueueMetrics[] = [];

    for (const queueType of Object.values(QueueType)) {
      const queueMetrics = await this.getQueueMetrics(queueType as QueueType);
      if (queueMetrics) {
        metrics.push(queueMetrics);
      }
    }

    return metrics;
  }

  async updateQueueConfig(
    queueType: QueueType,
    config: Partial<IQueueConfig>,
  ): Promise<QueueOperationResult> {
    const queue = this.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    await this.repository.updateQueueConfig(queue.name, {
      concurrency: config.concurrency,
      rateLimit: config.rateLimit as any,
      defaultJobOptions: config.defaultJobOptions as any,
      enableMetrics: config.enableMetrics,
      enableDeadLetter: config.enableDeadLetter,
    });

    return {
      success: true,
      message: `Queue ${queueType} configuration updated`,
      queueName: queue.name,
    };
  }

  private determineQueueStatus(isPaused: boolean, counts: any): QueueStatus {
    if (isPaused) return QueueStatus.PAUSED;
    if (counts.active > 0) return QueueStatus.ACTIVE;
    if (counts.waiting > 0 && counts.active === 0) return QueueStatus.ERROR;
    return QueueStatus.ACTIVE;
  }

  private calculateAvgProcessingTime(jobs: any[]): number | undefined {
    if (jobs.length === 0) return undefined;

    const times = jobs
      .filter((job) => job.finishedOn && job.processedOn)
      .map((job) => job.finishedOn - job.processedOn);

    if (times.length === 0) return undefined;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private calculateAvgWaitTime(jobs: any[]): number | undefined {
    if (jobs.length === 0) return undefined;

    const times = jobs
      .filter((job) => job.processedOn && job.timestamp)
      .map((job) => job.processedOn - job.timestamp);

    if (times.length === 0) return undefined;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private calculateThroughput(jobs: any[]): number | undefined {
    if (jobs.length === 0) return undefined;

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentJobs = jobs.filter(
      (job) => job.finishedOn && job.finishedOn > oneHourAgo,
    );

    return recentJobs.length;
  }

  private calculateErrorRate(counts: any): number {
    const total = counts.completed + counts.failed;
    if (total === 0) return 0;
    return (counts.failed / total) * 100;
  }

  private calculateHealthScore(counts: any, isPaused: boolean): number {
    let score = 100;

    if (isPaused) score -= 50;
    if (counts.waiting > 1000) score -= 20;
    if (counts.waiting > 5000) score -= 30;

    const errorRate = this.calculateErrorRate(counts);
    if (errorRate > 25) score -= 20;
    if (errorRate > 50) score -= 30;

    if (counts.active === 0 && counts.waiting > 0) score -= 40;

    return Math.max(0, score);
  }
}
