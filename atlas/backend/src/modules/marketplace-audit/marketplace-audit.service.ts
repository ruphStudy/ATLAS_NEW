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

    const typedActivity = activity as unknown as IActivityRecord;

    await this.eventQueue.publish({
      eventType: 'audit.recorded',
      workspaceId: options.workspaceId,
      provider: options.provider,
      accountId: options.accountId,
      activity: typedActivity,
      timestamp: new Date(),
    });

    const suspiciousActivity = await this.suspiciousActivityDetector.detect(
      typedActivity,
    );

    if (suspiciousActivity) {
      await this.repository.createSuspiciousActivity(suspiciousActivity);

      await this.eventQueue.publish({
        eventType: 'audit.suspicious',
        workspaceId: options.workspaceId,
        provider: options.provider,
        accountId: options.accountId,
        activity: typedActivity,
        metadata: {
          suspiciousActivity,
        },
        timestamp: new Date(),
      });
    }

    return typedActivity;
  }

  async searchActivities(
    criteria: IActivitySearchCriteria,
  ): Promise<IActivityRecord[]> {
    const activities = await this.repository.searchActivities(criteria);
    return activities as unknown as IActivityRecord[];
  }

  async countActivities(criteria: IActivitySearchCriteria): Promise<number> {
    return this.repository.countActivities(criteria);
  }

  async getActivity(
    id: string,
    workspaceId: string,
  ): Promise<IActivityRecord | null> {
    const activity = await this.repository.findActivity(id, workspaceId);
    return activity as unknown as IActivityRecord | null;
  }

  async getEntityHistory(
    workspaceId: string,
    entityType: any,
    entityId: string,
    limit?: number,
  ): Promise<IEntityHistory> {
    const activitiesRaw = await this.repository.findEntityHistory(
      workspaceId,
      entityType,
      entityId,
      limit,
    );
    const activities = activitiesRaw as unknown as IActivityRecord[];

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
      activities,
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
    const activitiesRaw = await this.repository.searchActivities({
      workspaceId,
      provider,
      accountId,
      startDate,
      endDate,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    const activities = activitiesRaw as unknown as IActivityRecord[];

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
      activities,
      totalCount,
    };
  }

  async getCorrelatedActivities(
    workspaceId: string,
    correlationId: string,
  ): Promise<IActivityRecord[]> {
    const activities = await this.repository.findByCorrelationId(workspaceId, correlationId);
    return activities as unknown as IActivityRecord[];
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
    const activities = await this.repository.findSuspiciousActivities(workspaceId, isResolved);
    return activities as unknown as ISuspiciousActivity[];
  }

  async resolveSuspiciousActivity(
    id: string,
    workspaceId: string,
  ): Promise<void> {
    await this.repository.resolveSuspiciousActivity(id, workspaceId);
  }

  async createRetentionPolicy(
    policy: Omit<IRetentionPolicy, 'id'>,
  ): Promise<IRetentionPolicy> {
    const created = await this.repository.createRetentionPolicy(policy);
    return created as unknown as IRetentionPolicy;
  }

  async getRetentionPolicies(
    workspaceId: string,
  ): Promise<IRetentionPolicy[]> {
    const policies = await this.repository.findRetentionPolicies(workspaceId);
    return policies as unknown as IRetentionPolicy[];
  }

  async applyRetentionPolicies(workspaceId: string): Promise<void> {
    const policiesRaw = await this.repository.findRetentionPolicies(workspaceId);
    const policies = policiesRaw as unknown as IRetentionPolicy[];

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
