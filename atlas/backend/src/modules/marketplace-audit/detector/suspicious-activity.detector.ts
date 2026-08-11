import { Injectable } from '@nestjs/common';
import { MarketplaceAuditRepository } from '../repository/marketplace-audit.repository';
import {
  IActivityRecord,
  ISuspiciousActivity,
  ISuspiciousActivityPattern,
  ActivityAction,
  ActivityStatus,
  ActorType,
} from '../interfaces';

@Injectable()
export class SuspiciousActivityDetector {
  private readonly patterns: ISuspiciousActivityPattern[] = [
    {
      pattern: 'MULTIPLE_FAILED_LOGINS',
      severity: 'HIGH',
      threshold: 5,
      timeWindowMinutes: 15,
    },
    {
      pattern: 'CREDENTIAL_ROTATION_SPIKE',
      severity: 'MEDIUM',
      threshold: 3,
      timeWindowMinutes: 60,
    },
    {
      pattern: 'MASS_DELETION',
      severity: 'CRITICAL',
      threshold: 10,
      timeWindowMinutes: 5,
    },
    {
      pattern: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      severity: 'CRITICAL',
    },
    {
      pattern: 'REPEATED_FAILURES',
      severity: 'MEDIUM',
      threshold: 10,
      timeWindowMinutes: 30,
    },
    {
      pattern: 'UNUSUAL_WEBHOOK_ACTIVITY',
      severity: 'MEDIUM',
      threshold: 50,
      timeWindowMinutes: 10,
    },
  ];

  constructor(private readonly repository: MarketplaceAuditRepository) {}

  async detect(
    activity: IActivityRecord,
  ): Promise<ISuspiciousActivity | null> {
    for (const pattern of this.patterns) {
      const suspiciousActivity = await this.checkPattern(activity, pattern);
      if (suspiciousActivity) {
        return suspiciousActivity;
      }
    }

    return null;
  }

  private async checkPattern(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    switch (pattern.pattern) {
      case 'MULTIPLE_FAILED_LOGINS':
        return this.checkMultipleFailedLogins(activity, pattern);

      case 'CREDENTIAL_ROTATION_SPIKE':
        return this.checkCredentialRotationSpike(activity, pattern);

      case 'MASS_DELETION':
        return this.checkMassDeletion(activity, pattern);

      case 'UNAUTHORIZED_ACCESS_ATTEMPT':
        return this.checkUnauthorizedAccess(activity, pattern);

      case 'REPEATED_FAILURES':
        return this.checkRepeatedFailures(activity, pattern);

      case 'UNUSUAL_WEBHOOK_ACTIVITY':
        return this.checkUnusualWebhookActivity(activity, pattern);

      default:
        return null;
    }
  }

  private async checkMultipleFailedLogins(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    if (
      activity.status !== ActivityStatus.FAILURE ||
      activity.action !== ActivityAction.CONNECTED
    ) {
      return null;
    }

    if (!activity.actor.id) return null;

    const recentActivities = await this.repository.findRecentActivitiesByActor(
      activity.workspaceId,
      activity.actor.type,
      activity.actor.id,
      pattern.timeWindowMinutes!,
    );

    const failedLogins = recentActivities.filter(
      (a) =>
        a.action === ActivityAction.CONNECTED &&
        a.status === ActivityStatus.FAILURE,
    );

    if (failedLogins.length >= pattern.threshold!) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: `${failedLogins.length} failed login attempts in ${pattern.timeWindowMinutes} minutes`,
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }

  private async checkCredentialRotationSpike(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    if (activity.action !== ActivityAction.CREDENTIAL_ROTATED) {
      return null;
    }

    const recentActivities = await this.repository.findRecentActivitiesByActor(
      activity.workspaceId,
      activity.actor.type,
      activity.actor.id || '',
      pattern.timeWindowMinutes!,
    );

    const rotations = recentActivities.filter(
      (a) => a.action === ActivityAction.CREDENTIAL_ROTATED,
    );

    if (rotations.length >= pattern.threshold!) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: `${rotations.length} credential rotations in ${pattern.timeWindowMinutes} minutes`,
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }

  private async checkMassDeletion(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    if (activity.action !== ActivityAction.DELETED) {
      return null;
    }

    const recentActivities = await this.repository.findRecentActivitiesByActor(
      activity.workspaceId,
      activity.actor.type,
      activity.actor.id || '',
      pattern.timeWindowMinutes!,
    );

    const deletions = recentActivities.filter(
      (a) => a.action === ActivityAction.DELETED,
    );

    if (deletions.length >= pattern.threshold!) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: `${deletions.length} deletions in ${pattern.timeWindowMinutes} minutes`,
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }

  private checkUnauthorizedAccess(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): ISuspiciousActivity | null {
    if (
      activity.status === ActivityStatus.FAILURE &&
      (activity.errorCode === 'AUTHORIZATION_FAILED' ||
        activity.errorCode === 'INSUFFICIENT_PERMISSIONS')
    ) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: 'Unauthorized access attempt detected',
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }

  private async checkRepeatedFailures(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    if (activity.status !== ActivityStatus.FAILURE) {
      return null;
    }

    const recentFailures = await this.repository.findFailuresByEntity(
      activity.workspaceId,
      activity.entityType,
      activity.entityId,
      pattern.timeWindowMinutes!,
    );

    if (recentFailures.length >= pattern.threshold!) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: `${recentFailures.length} failures for entity ${activity.entityType}:${activity.entityId} in ${pattern.timeWindowMinutes} minutes`,
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }

  private async checkUnusualWebhookActivity(
    activity: IActivityRecord,
    pattern: ISuspiciousActivityPattern,
  ): Promise<ISuspiciousActivity | null> {
    if (activity.action !== ActivityAction.WEBHOOK_RECEIVED) {
      return null;
    }

    const recentActivities = await this.repository.searchActivities({
      workspaceId: activity.workspaceId,
      provider: activity.provider,
      action: ActivityAction.WEBHOOK_RECEIVED,
      startDate: new Date(
        Date.now() - pattern.timeWindowMinutes! * 60 * 1000,
      ),
      endDate: new Date(),
    });

    if (recentActivities.length >= pattern.threshold!) {
      return {
        activityId: activity.id,
        workspaceId: activity.workspaceId,
        reason: `${recentActivities.length} webhook events in ${pattern.timeWindowMinutes} minutes`,
        severity: pattern.severity,
        detectedAt: new Date(),
        isResolved: false,
      };
    }

    return null;
  }
}
