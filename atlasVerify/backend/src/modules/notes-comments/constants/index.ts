export const NOTES_COMMENTS_MODULE = 'notes-comments';

/** Roles permitted to edit/delete/archive notes and comments authored by someone else. */
export const NOTES_ADMIN_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
