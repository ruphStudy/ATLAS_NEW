export enum ActivityActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SCHEDULER = 'SCHEDULER',
  WEBHOOK = 'WEBHOOK',
  PROVIDER = 'PROVIDER',
  AI_AGENT = 'AI_AGENT',
  /** A true ATLAS-staff platform admin acting outside any single tenant's membership (see `PlatformAdminGuard`) — distinct from a workspace OWNER/ADMIN, which remains `USER`. */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  /** A tenant-side admin acting across an organization's multiple workspaces (see `Workspace.organizationId`) — distinct from a single-workspace `USER`. */
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  /** A machine credential (API key / OAuth client) acting on a tenant's behalf, not an interactive `USER` or a `SCHEDULER`/`WEBHOOK` job. */
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
}

export enum ActivityOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
}

export enum ActivityStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DISMISSED = 'DISMISSED',
}

export enum ActivityEvent {
  ACTIVITY_RECORDED = 'activity-center.recorded',
  ACTIVITY_READ = 'activity-center.read',
  ACTIVITY_ALL_READ = 'activity-center.all_read',
  ACTIVITY_PINNED = 'activity-center.pinned',
  ACTIVITY_UNPINNED = 'activity-center.unpinned',
  ACTIVITY_ARCHIVED = 'activity-center.archived',
  ACTIVITY_RESTORED = 'activity-center.restored',
  ACTIVITY_DISMISSED = 'activity-center.dismissed',
  ACTIVITY_DELETED = 'activity-center.deleted',
}

export interface IActivityEntry {
  id: string;
  workspaceId: string;
  actorType: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  sourceModule: string;
  entityType?: string | null;
  entityId?: string | null;
  outcome: ActivityOutcome;
  title: string;
  description?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  jobId?: string | null;
  workflowId?: string | null;
  externalRef?: string | null;
  timelineId?: string | null;
  status: ActivityStatus;
  pinned: boolean;
  recipientUserId?: string | null;
  dedupeKey?: string | null;
  metadata: unknown;
  readAt?: Date | null;
  pinnedAt?: Date | null;
  archivedAt?: Date | null;
  dismissedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IActivityEventPayload {
  event: ActivityEvent;
  workspaceId: string;
  activityId?: string;
  recipientUserId?: string;
  timelineId?: string;
  metadata?: Record<string, unknown>;
}
