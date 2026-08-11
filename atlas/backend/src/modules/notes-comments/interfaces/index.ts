export enum NoteType {
  NOTE = 'NOTE',
  COMMENT = 'COMMENT',
}

export enum NoteVisibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  WORKSPACE = 'WORKSPACE',
  ENTITY_PARTICIPANTS = 'ENTITY_PARTICIPANTS',
}

export enum NoteStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum NotesCommentsEvent {
  NOTE_CREATED = 'notes-comments.note_created',
  COMMENT_CREATED = 'notes-comments.comment_created',
  REPLY_CREATED = 'notes-comments.reply_created',
  NOTE_UPDATED = 'notes-comments.note_updated',
  NOTE_ARCHIVED = 'notes-comments.note_archived',
  NOTE_RESTORED = 'notes-comments.note_restored',
  NOTE_DELETED = 'notes-comments.note_deleted',
  NOTE_PINNED = 'notes-comments.note_pinned',
  NOTE_UNPINNED = 'notes-comments.note_unpinned',
  NOTE_RESOLVED = 'notes-comments.note_resolved',
  NOTE_UNRESOLVED = 'notes-comments.note_unresolved',
  MENTION_CREATED = 'notes-comments.mention_created',
}

export interface INote {
  id: string;
  workspaceId: string;
  noteType: NoteType;
  module?: string | null;
  entityType: string;
  entityId: string;
  parentId?: string | null;
  authorId: string;
  content: string;
  visibility: NoteVisibility;
  visibilityRoleKey?: string | null;
  isPinned: boolean;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  isEdited: boolean;
  editedAt?: Date | null;
  mentionedUserIds: string[];
  mentionedRoleKeys: string[];
  status: NoteStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface INoteEditHistory {
  id: string;
  noteId: string;
  workspaceId: string;
  previousContent: string;
  editedBy?: string | null;
  createdAt: Date;
}

export interface INoteAttachment {
  id: string;
  noteId: string;
  workspaceId: string;
  fileId: string;
  addedBy?: string | null;
  createdAt: Date;
}

export interface INotesCommentsEventPayload {
  event: NotesCommentsEvent;
  workspaceId: string;
  noteId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
