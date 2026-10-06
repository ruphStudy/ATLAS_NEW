import { TagScope, TagManagedBy, TagStatus } from '../interfaces';

export class TagResponseDto {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope: TagScope;
  module?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  groupId?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  displayOrder: number;
  managedBy: TagManagedBy;
  isSystem: boolean;
  status: TagStatus;
  usageCount: number;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export class PaginatedTagResponseDto {
  data: TagResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TagGroupResponseDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TagAssignmentResponseDto {
  id: string;
  tagId: string;
  entityType: string;
  entityId: string;
  assignedBy?: string | null;
  createdAt: Date;
}

export class TagHistoryResponseDto {
  id: string;
  tagId: string;
  fromStatus?: TagStatus | null;
  toStatus: TagStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class TagSavedViewResponseDto {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  filters: unknown;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}
