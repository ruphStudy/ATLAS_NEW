import { NoteType, NoteVisibility, NoteStatus } from '../interfaces';

export class NoteResponseDto {
  id!: string;
  workspaceId!: string;
  noteType!: NoteType;
  module?: string | null;
  entityType!: string;
  entityId!: string;
  parentId?: string | null;
  authorId!: string;
  content!: string;
  visibility!: NoteVisibility;
  visibilityRoleKey?: string | null;
  isPinned!: boolean;
  isResolved!: boolean;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  isEdited!: boolean;
  editedAt?: Date | null;
  mentionedUserIds!: string[];
  mentionedRoleKeys!: string[];
  status!: NoteStatus;
  createdAt!: Date;
  updatedAt!: Date;
  archivedAt?: Date | null;
}

export class PaginatedNoteResponseDto {
  data!: NoteResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class NoteEditHistoryResponseDto {
  id!: string;
  noteId!: string;
  previousContent!: string;
  editedBy?: string | null;
  createdAt!: Date;
}

export class NoteAttachmentResponseDto {
  id!: string;
  noteId!: string;
  fileId!: string;
  addedBy?: string | null;
  createdAt!: Date;
}
