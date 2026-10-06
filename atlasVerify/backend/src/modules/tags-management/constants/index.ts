export const TAGS_MANAGEMENT_MODULE = 'tags-management';

/** Roles permitted to manage GLOBAL/ORGANIZATION-scope tags and SYSTEM-managed tags at any scope. */
export const TAGS_GLOBAL_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles permitted to manage WORKSPACE/MODULE-scope tags authored by someone else. */
export const TAGS_WORKSPACE_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const TAG_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'displayOrder', 'usageCount'] as const;

export const MAX_BULK_TAG_OPERATION_SIZE = 100;
