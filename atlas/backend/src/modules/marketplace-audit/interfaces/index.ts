export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SCHEDULER = 'SCHEDULER',
  WEBHOOK = 'WEBHOOK',
  PROVIDER = 'PROVIDER',
  API = 'API',
}

export enum ActivityModule {
  ACCOUNT = 'ACCOUNT',
  CONFIGURATION = 'CONFIGURATION',
  CREDENTIAL = 'CREDENTIAL',
  CATALOG_SYNC = 'CATALOG_SYNC',
  INVENTORY_SYNC = 'INVENTORY_SYNC',
  LISTING_SYNC = 'LISTING_SYNC',
  ORDER_SYNC = 'ORDER_SYNC',
  SHIPMENT_SYNC = 'SHIPMENT_SYNC',
  RETURN_SYNC = 'RETURN_SYNC',
  PRICING_SYNC = 'PRICING_SYNC',
  REPORT_SYNC = 'REPORT_SYNC',
  WEBHOOK = 'WEBHOOK',
  EVENT = 'EVENT',
  QUEUE = 'QUEUE',
  ADAPTER = 'ADAPTER',
  PROVIDER = 'PROVIDER',
}

export enum ActivityAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CANCELLED = 'SYNC_CANCELLED',
  SYNC_RETRIED = 'SYNC_RETRIED',
  WEBHOOK_REGISTERED = 'WEBHOOK_REGISTERED',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
  EVENT_RECEIVED = 'EVENT_RECEIVED',
  EVENT_PROCESSED = 'EVENT_PROCESSED',
  EVENT_FAILED = 'EVENT_FAILED',
  JOB_QUEUED = 'JOB_QUEUED',
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  JOB_RETRIED = 'JOB_RETRIED',
  JOB_CANCELLED = 'JOB_CANCELLED',
  CREDENTIAL_ROTATED = 'CREDENTIAL_ROTATED',
  CREDENTIAL_VALIDATED = 'CREDENTIAL_VALIDATED',
  CREDENTIAL_EXPIRED = 'CREDENTIAL_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
}

export enum ActivityStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  RETRIED = 'RETRIED',
  PARTIAL = 'PARTIAL',
}

export enum EntityType {
  ACCOUNT = 'ACCOUNT',
  CONFIGURATION = 'CONFIGURATION',
  CREDENTIAL = 'CREDENTIAL',
  SYNC_JOB = 'SYNC_JOB',
  WEBHOOK = 'WEBHOOK',
  EVENT = 'EVENT',
  QUEUE_JOB = 'QUEUE_JOB',
  ADAPTER = 'ADAPTER',
  PROVIDER = 'PROVIDER',
  USER = 'USER',
}

export interface IActor {
  type: ActorType;
  id?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface IChangeReference {
  before?: Record<string, any>;
  after?: Record<string, any>;
  changedFields?: string[];
}

export interface IActivityRecord {
  id: string;
  workspaceId: string;
  provider: string;
  accountId?: string;
  module: ActivityModule;
  action: ActivityAction;
  status: ActivityStatus;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  actor: IActor;
  changeReference?: IChangeReference;
  metadata?: Record<string, any>;
  correlationId?: string;
  requestId?: string;
  jobId?: string;
  externalId?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

export interface IActivitySearchCriteria {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  module?: ActivityModule;
  action?: ActivityAction;
  status?: ActivityStatus;
  actorType?: ActorType;
  actorId?: string;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  correlationId?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface IEntityHistory {
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  activities: IActivityRecord[];
  totalCount: number;
}

export interface IActivityTimeline {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  startDate: Date;
  endDate: Date;
  activities: IActivityRecord[];
  totalCount: number;
  groupedByDate?: Map<string, IActivityRecord[]>;
}

export interface IAuditEvent {
  eventType: 'audit.recorded' | 'audit.suspicious' | 'audit.threshold_exceeded';
  workspaceId: string;
  provider: string;
  accountId?: string;
  activity: IActivityRecord;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IRetentionPolicy {
  workspaceId: string;
  module?: ActivityModule;
  retentionDays: number;
  archiveBeforeDelete: boolean;
  enabled: boolean;
}

export interface IAuditStatistics {
  workspaceId: string;
  totalActivities: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  cancelledCount: number;
  byModule: Record<ActivityModule, number>;
  byAction: Record<ActivityAction, number>;
  byStatus: Record<ActivityStatus, number>;
  byActor: Record<ActorType, number>;
  topEntities: Array<{
    entityType: EntityType;
    entityId: string;
    activityCount: number;
  }>;
}

export interface ISuspiciousActivity {
  activityId: string;
  workspaceId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

export interface ISuspiciousActivityPattern {
  pattern: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold?: number;
  timeWindowMinutes?: number;
}

export interface RecordActivityOptions {
  workspaceId: string;
  provider: string;
  accountId?: string;
  module: ActivityModule;
  action: ActivityAction;
  status: ActivityStatus;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  actor: IActor;
  changeReference?: IChangeReference;
  metadata?: Record<string, any>;
  correlationId?: string;
  requestId?: string;
  jobId?: string;
  externalId?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
}
