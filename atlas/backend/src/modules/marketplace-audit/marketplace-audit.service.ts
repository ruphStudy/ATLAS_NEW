import { Injectable } from '@nestjs/common';
import { MarketplaceAuditRepository } from './repository/marketplace-audit.repository';
import { MetadataSanitizer } from './sanitizer/metadata.sanitizer';
import { SuspiciousActivityDetector } from './detector/suspicious-activity.detector';
import { AuditEventQueue } from './events/audit-event.queue';
import {
  IActivityRecord,
  IActivitySearchCriteria,
  IEntityHistory,
  IActivityTimeline,
  IAuditStatistics,
  ISuspiciousActivity,
  IRetentionPolicy,
  RecordActivityOptions,
  ActivityStatus,
} from './interfaces';

@Injectable()
export class MarketplaceAuditService {
  constructor(
    private readonly repository: MarketplaceAuditRepository,
    private readonly sanitizer: MetadataSanitizer,
    private readonly suspiciousActivityDetector: SuspiciousActivityDetector,
    private readonly eventQueue: AuditEventQueue,
  ) {}

  async recordActivity(options: RecordActivityOptions): Promise<IActivityRecord> {
    const sanitizedMetadata = this.sanitizer.sanitize(options.metadata);
    const sanitizedChangeReference = this.sanitizer.sanitizeChangeReference(
      options.changeReference,
    );

    const activity = await this.repository.createActivity({
      workspaceId: options.workspaceId,
      provider: options.provider,
      accountId: options.accountId,
      module: options.module,
      action: options.action,
      status: options.status,
      entityType: options.entityType,
      entityId: options.entityId,
      entityName: options.entityName,
      actor: options.actor as any,
      changeReference: sanitizedChangeReference as any,
      metadata: sanitizedMetadata,
      correlationId: options.correlationId,
      requestId: options.requestId,
      jobId: options.jobId,
      externalId: options.externalId,
      duration: options.duration,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
    });

    await this.eventQueue.publish({
      eventType: 'audit.recorded',
      workspaceId: options.workspaceId,
      provider: options.provider,
      accountId: options.accountId,
      activity: activity as IActivityRecord,
      timestamp: new Date(),
    });

    const suspiciousActivity = await this.suspiciousActivityDetector.detect(
      activity as IActivityRecord,
    );

    if (suspiciousActivity) {
      await this.repository.createSuspiciousActivity(suspiciousActivity);

      await this.eventQueue.publish({
        eventType: 'audit.suspicious',
        workspaceId: options.workspaceId,
        provider: options.provider,
        accountId: options.accountId,
        activity: activity as IActivityRecord,
        metadata: {
          suspiciousActivity,
        },
        timestamp: new Date(),
      });
    }

    return activity as IActivityRecord;
  }

  async searchActivities(
    criteria: IActivitySearchCriteria,
  ): Promise<IActivityRecord[]> {
    return this.repository.searchActivities(criteria);
  }

  async countActivities(criteria: IActivitySearchCriteria): Promise<number> {
    return this.repository.countActivities(criteria);
  }

  async getActivity(
    id: string,
    workspaceId: string,
  ): Promise<IActivityRecord | null> {
    return this.repository.findActivity(id, workspaceId);
  }

  async getEntityHistory(
    workspaceId: string,
    entityType: any,
    entityId: string,
    limit?: number,
  ): Promise<IEntityHistory> {
    const activities = await this.repository.findEntityHistory(
      workspaceId,
      entityType,
      entityId,
      limit,
    );

    const totalCount = await this.repository.countActivities({
      workspaceId,
      entityType,
      entityId,
    });

    const entityName = activities[0]?.entityName;

    return {
      entityType,
      entityId,
      entityName,
      activities: activities as IActivityRecord[],
      totalCount,
    };
  }

  async getActivityTimeline(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    provider?: string,
    accountId?: string,
    limit?: number,
  ): Promise<IActivityTimeline> {
    const activities = await this.repository.searchActivities({
      workspaceId,
      provider,
      accountId,
      startDate,
      endDate,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const totalCount = await this.repository.countActivities({
      workspaceId,
      provider,
      accountId,
      startDate,
      endDate,
    });

    return {
      workspaceId,
      provider,
      accountId,
      startDate,
      endDate,
      activities: activities as IActivityRecord[],
      totalCount,
    };
  }

  async getCorrelatedActivities(
    workspaceId: string,
    correlationId: string,
  ): Promise<IActivityRecord[]> {
    return this.repository.findByCorrelationId(workspaceId, correlationId);
  }

  async getStatistics(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IAuditStatistics> {
    const activities = await this.repository.searchActivities({
      workspaceId,
      startDate,
      endDate,
    });

    const successCount = activities.filter(
      (a) => a.status === ActivityStatus.SUCCESS,
    ).length;
    const failureCount = activities.filter(
      (a) => a.status === ActivityStatus.FAILURE,
    ).length;
    const retryCount = activities.filter(
      (a) => a.status === ActivityStatus.RETRIED,
    ).length;
    const cancelledCount = activities.filter(
      (a) => a.status === ActivityStatus.CANCELLED,
    ).length;

    const [byModule, byAction, byStatus, byActor, topEntities] =
      await Promise.all([
        this.repository.aggregateByModule(workspaceId, startDate, endDate),
        this.repository.aggregateByAction(workspaceId, startDate, endDate),
        this.repository.aggregateByStatus(workspaceId, startDate, endDate),
        this.repository.aggregateByActor(workspaceId, startDate, endDate),
        this.repository.findTopEntities(workspaceId, startDate, endDate),
      ]);

    return {
      workspaceId,
      totalActivities: activities.length,
      successCount,
      failureCount,
      retryCount,
      cancelledCount,
      byModule: byModule as any,
      byAction: byAction as any,
      byStatus: byStatus as any,
      byActor: byActor as any,
      topEntities,
    };
  }

  async getSuspiciousActivities(
    workspaceId: string,
    isResolved?: boolean,
  ): Promise<ISuspiciousActivity[]> {
    return this.repository.findSuspiciousActivities(workspaceId, isResolved);
  }

  async resolveSuspiciousActivity(
    id: string,
    workspaceId: string,
  ): Promise<void> {
    await this.repository.resolveSuspiciousActivity(id, workspaceId);
  }

  async createRetentionPolicy(
    policy: IRetentionPolicy,
  ): Promise<IRetentionPolicy> {
    return this.repository.createRetentionPolicy(policy);
  }

  async getRetentionPolicies(
    workspaceId: string,
  ): Promise<IRetentionPolicy[]> {
    return this.repository.findRetentionPolicies(workspaceId);
  }

  async applyRetentionPolicies(workspaceId: string): Promise<void> {
    const policies = await this.repository.findRetentionPolicies(workspaceId);

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      await this.repository.deleteActivitiesOlderThan(
        workspaceId,
        cutoffDate,
        policy.module,
      );
    }
  }
}
