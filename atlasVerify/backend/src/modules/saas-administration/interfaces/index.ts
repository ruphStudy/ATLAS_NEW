export enum SupportStatus {
  NONE = 'NONE',
  OPEN = 'OPEN',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
}

export enum AdminActionType {
  TENANT_STATUS_CHANGE = 'TENANT_STATUS_CHANGE',
  PLAN_ASSIGNMENT = 'PLAN_ASSIGNMENT',
  SUBSCRIPTION_OVERRIDE = 'SUBSCRIPTION_OVERRIDE',
  QUOTA_OVERRIDE = 'QUOTA_OVERRIDE',
  FEATURE_OVERRIDE = 'FEATURE_OVERRIDE',
  LICENSE_ACTION = 'LICENSE_ACTION',
  PAYMENT_ACTION = 'PAYMENT_ACTION',
  NOTE_ADDED = 'NOTE_ADDED',
  FLAG_UPDATED = 'FLAG_UPDATED',
  SUPPORT_STATUS_CHANGE = 'SUPPORT_STATUS_CHANGE',
  IMPERSONATION_STARTED = 'IMPERSONATION_STARTED',
  IMPERSONATION_ENDED = 'IMPERSONATION_ENDED',
}

export enum ImpersonationStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export enum SaasAdminEvent {
  TENANT_STATUS_CHANGED = 'saas-administration.tenant_status_changed',
  PLAN_ASSIGNED = 'saas-administration.plan_assigned',
  SUBSCRIPTION_OVERRIDDEN = 'saas-administration.subscription_overridden',
  QUOTA_OVERRIDDEN = 'saas-administration.quota_overridden',
  FEATURE_OVERRIDDEN = 'saas-administration.feature_overridden',
  NOTE_ADDED = 'saas-administration.note_added',
  FLAGS_UPDATED = 'saas-administration.flags_updated',
  SUPPORT_STATUS_CHANGED = 'saas-administration.support_status_changed',
  IMPERSONATION_STARTED = 'saas-administration.impersonation_started',
  IMPERSONATION_ENDED = 'saas-administration.impersonation_ended',
}

export interface ITenantAdminProfile {
  id: string;
  workspaceId: string;
  internalFlags: string[];
  supportStatus: SupportStatus;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminNote {
  id: string;
  workspaceId: string;
  note: string;
  createdBy: string | null;
  createdAt: Date;
}

export interface IAdminActionLog {
  id: string;
  actionType: AdminActionType;
  targetWorkspaceId: string | null;
  targetUserId: string | null;
  performedBy: string;
  reason: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IImpersonationSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetWorkspaceId: string;
  reason: string;
  ipAddress: string | null;
  status: ImpersonationStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}

/** The read-model this module's tenant overview composes from other services — never a duplicated data store, always assembled at read time. */
export interface ITenantOverview {
  workspace: {
    id: string;
    name: string;
    status: string;
    plan: string | null;
  };
  subscription: {
    id: string;
    status: string;
    planKey: string;
    isTrial: boolean;
  } | null;
  billing: {
    outstandingBalance: number;
    latestPeriodStatus: string | null;
  } | null;
  recentPaymentFailures: number;
  quotaViolations: number;
  adminProfile: ITenantAdminProfile | null;
}

export interface IImpersonationResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  targetUserId: string;
  targetWorkspaceId: string;
}

export interface ISaasAdminEventPayload {
  event: SaasAdminEvent;
  targetWorkspaceId?: string | null;
  targetUserId?: string | null;
  performedBy: string;
  metadata?: Record<string, unknown>;
}
