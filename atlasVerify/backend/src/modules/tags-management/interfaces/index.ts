export enum TagScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  MODULE = 'MODULE',
}

export enum TagManagedBy {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

export enum TagStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum TagsManagementEvent {
  TAG_CREATED = 'tags-management.tag_created',
  TAG_UPDATED = 'tags-management.tag_updated',
  TAG_ARCHIVED = 'tags-management.tag_archived',
  TAG_RESTORED = 'tags-management.tag_restored',
  TAG_DELETED = 'tags-management.tag_deleted',
  TAG_GROUP_CREATED = 'tags-management.group_created',
  TAG_GROUP_UPDATED = 'tags-management.group_updated',
  TAG_GROUP_DELETED = 'tags-management.group_deleted',
  TAG_ASSIGNED = 'tags-management.tag_assigned',
  TAG_UNASSIGNED = 'tags-management.tag_unassigned',
  TAGS_BULK_ASSIGNED = 'tags-management.tags_bulk_assigned',
  TAGS_BULK_UNASSIGNED = 'tags-management.tags_bulk_unassigned',
}

export interface ITag {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeKey: string;
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
  deletedAt?: Date | null;
}

export interface ITagGroup {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeKey: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITagAssignment {
  id: string;
  tagId: string;
  workspaceId: string;
  module?: string | null;
  entityType: string;
  entityId: string;
  assignedBy?: string | null;
  createdAt: Date;
}

export interface ITagHistory {
  id: string;
  tagId: string;
  workspaceId?: string | null;
  fromStatus?: TagStatus | null;
  toStatus: TagStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ITagSavedView {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  filters: unknown;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITagsManagementEventPayload {
  event: TagsManagementEvent;
  workspaceId?: string;
  tagId?: string;
  groupId?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
