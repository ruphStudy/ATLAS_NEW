export enum ScheduleType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  CRON = 'cron',
}

export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

export enum ScheduleFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum DeliveryMethod {
  EMAIL = 'email',
  NOTIFICATION_CENTER = 'notification_center',
  FILE_STORAGE = 'file_storage',
}

export enum OutputFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ScheduledReportEvent {
  SCHEDULE_CREATED = 'schedule_created',
  SCHEDULE_UPDATED = 'schedule_updated',
  SCHEDULE_ENABLED = 'schedule_enabled',
  SCHEDULE_DISABLED = 'schedule_disabled',
  SCHEDULE_PAUSED = 'schedule_paused',
  SCHEDULE_RESUMED = 'schedule_resumed',
  SCHEDULE_DELETED = 'schedule_deleted',
  EXECUTION_SCHEDULED = 'execution_scheduled',
  EXECUTION_STARTED = 'execution_started',
  GENERATION_STARTED = 'generation_started',
  GENERATION_COMPLETED = 'generation_completed',
  GENERATION_FAILED = 'generation_failed',
  DELIVERY_STARTED = 'delivery_started',
  DELIVERY_COMPLETED = 'delivery_completed',
  DELIVERY_FAILED = 'delivery_failed',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  EXECUTION_RETRYING = 'execution_retrying',
  MISSED_RUN_DETECTED = 'missed_run_detected',
  MISSED_RUN_RECOVERED = 'missed_run_recovered',
}

export interface IScheduleRecipient {
  email?: string;
  userId?: string;
  notificationPreferences?: {
    onSuccess: boolean;
    onFailure: boolean;
  };
}

export interface IScheduleConfig {
  type: ScheduleType;
  frequency?: ScheduleFrequency;
  cronExpression?: string;
  interval?: number;
  timezone: string;
  startDate: Date;
  endDate?: Date;
  executeAt?: Date;
  maxExecutions?: number;
}

export interface IDeliveryConfig {
  methods: DeliveryMethod[];
  outputFormats: OutputFormat[];
  emailSubject?: string;
  emailBody?: string;
  fileStoragePath?: string;
  notificationTitle?: string;
  notificationMessage?: string;
}

export interface IReportSchedule {
  id: string;
  workspaceId: string;
  scheduleKey: string;
  name: string;
  description?: string;
  reportDefinitionId: string;
  status: ScheduleStatus;
  scheduleConfig: IScheduleConfig;
  reportFilters?: any[];
  reportDateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };
  reportParameters?: Record<string, any>;
  recipients: IScheduleRecipient[];
  deliveryConfig: IDeliveryConfig;
  locale?: string;
  enabled: boolean;
  paused: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: ExecutionStatus;
  executionCount: number;
  successCount: number;
  failureCount: number;
  maxRetries: number;
  retryBackoff: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };
  allowConcurrentExecution: boolean;
  idempotencyEnabled: boolean;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IScheduleExecution {
  id: string;
  scheduleId: string;
  workspaceId: string;
  reportDefinitionId: string;
  scheduleKey: string;
  status: ExecutionStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  attemptNumber: number;
  isManual: boolean;
  isMissedRunRecovery: boolean;
  generationStartedAt?: Date;
  generationCompletedAt?: Date;
  generationDuration?: number;
  reportExecutionId?: string;
  deliveryStartedAt?: Date;
  deliveryCompletedAt?: Date;
  deliveryDuration?: number;
  outputReferences?: Array<{
    method: DeliveryMethod;
    format: OutputFormat;
    reference: string;
    size?: number;
    deliveredAt?: Date;
  }>;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  retriedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduleExecutionLog {
  id: string;
  executionId: string;
  workspaceId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface IScheduledReportEventPayload {
  event: ScheduledReportEvent;
  workspaceId: string;
  scheduleId?: string;
  scheduleKey?: string;
  executionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
