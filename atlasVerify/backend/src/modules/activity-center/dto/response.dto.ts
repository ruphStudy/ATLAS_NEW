import { ActivityActorType, ActivityOutcome, ActivityStatus } from '../interfaces';

export class ActivityEntryResponseDto {
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
  readAt?: Date | null;
  pinnedAt?: Date | null;
  archivedAt?: Date | null;
  dismissedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedActivityEntryResponseDto {
  data: ActivityEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UnreadActivityCountResponseDto {
  unreadCount: number;
}

export class ActivityTimelineResponseDto {
  timelineId: string;
  entries: ActivityEntryResponseDto[];
}
