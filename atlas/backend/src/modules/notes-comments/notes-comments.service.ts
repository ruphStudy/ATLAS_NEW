import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationType, NotificationPriority, NotificationTargetType } from '@modules/notifications/interfaces';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { RecordActivityDto } from '@modules/activity-center/dto';
import { ActivityActorType, ActivityOutcome } from '@modules/activity-center/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { AuditActionCategory } from '@modules/audit-logs/interfaces';
import { NotesCommentsRepository } from './notes-comments.repository';
import { NotesCommentsEventQueue } from './jobs';
import {
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilterDto,
  CreateAttachmentDto,
  PaginatedNoteResponseDto,
} from './dto';
import {
  INote,
  INoteEditHistory,
  INoteAttachment,
  NoteType,
  NoteVisibility,
  NoteStatus,
  NotesCommentsEvent,
} from './interfaces';
import { NOTES_COMMENTS_MODULE, NOTES_ADMIN_ROLES } from './constants';
import {
  NoteNotFoundException,
  NoteAccessDeniedException,
  NoteInvalidStateTransitionException,
  NoteAttachmentNotFoundException,
  NoteAttachmentAlreadyExistsException,
  NoteParentNotFoundException,
} from './exceptions/notes-comments.exceptions';

@Injectable()
export class NotesCommentsService {
  private readonly logger = new Logger(NotesCommentsService.name);

  constructor(
    private readonly repository: NotesCommentsRepository,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: NotesCommentsEventQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async createNote(workspaceId: string, userId: string, dto: CreateNoteDto): Promise<INote> {
    let noteType = dto.noteType ?? NoteType.NOTE;
    let module = dto.module;
    let entityType = dto.entityType;
    let entityId = dto.entityId;

    if (dto.parentId) {
      const parent = await this.repository.findById(dto.parentId, workspaceId);
      if (!parent) {
        throw new NoteParentNotFoundException(dto.parentId);
      }
      // Replies always thread under their parent's identity — keeps a conversation internally consistent.
      noteType = NoteType.COMMENT;
      module = parent.module ?? undefined;
      entityType = parent.entityType;
      entityId = parent.entityId;
    }

    const note = await this.repository.create({
      workspaceId,
      noteType,
      module,
      entityType,
      entityId,
      parentId: dto.parentId,
      authorId: userId,
      content: dto.content,
      visibility: dto.visibility ?? NoteVisibility.WORKSPACE,
      visibilityRoleKey: dto.visibilityRoleKey,
      mentionedUserIds: dto.mentionedUserIds ?? [],
      mentionedRoleKeys: dto.mentionedRoleKeys ?? [],
      status: NoteStatus.ACTIVE,
    });

    const event = dto.parentId
      ? NotesCommentsEvent.REPLY_CREATED
      : noteType === NoteType.COMMENT
        ? NotesCommentsEvent.COMMENT_CREATED
        : NotesCommentsEvent.NOTE_CREATED;

    await this.recordActivity(workspaceId, userId, `notes-comments.${noteType.toLowerCase()}_created`, note);
    await this.recordAudit(workspaceId, userId, `notes-comments.${noteType.toLowerCase()}.created`, AuditActionCategory.CREATE, note.id);
    await this.publishEvent(event, { workspaceId, noteId: note.id, module: note.module ?? undefined, entityType: note.entityType, entityId: note.entityId, actorId: userId });

    await this.notifyMentions(workspaceId, note, userId);
    return note;
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    if (!(await this.canView(note, userId, userRole, workspaceId))) {
      throw new NoteAccessDeniedException();
    }
    return note;
  }

  async findAll(
    workspaceId: string,
    userId: string,
    userRole: string,
    filter: NoteFilterDto,
  ): Promise<PaginatedNoteResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const visible: INote[] = [];
    for (const note of data) {
      if (await this.canView(note, userId, userRole, workspaceId)) {
        visible.push(note);
      }
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: visible as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listReplies(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote[]> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    if (!(await this.canView(note, userId, userRole, workspaceId))) {
      throw new NoteAccessDeniedException();
    }

    const replies = await this.repository.listReplies(id);
    const visible: INote[] = [];
    for (const reply of replies) {
      if (await this.canView(reply, userId, userRole, workspaceId)) {
        visible.push(reply);
      }
    }
    return visible;
  }

  // ── Update (edit) ───────────────────────────────────────────────

  async updateNote(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateNoteDto): Promise<INote> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);

    if (dto.content !== undefined && dto.content !== note.content) {
      await this.repository.createEditHistory({
        noteId: id,
        workspaceId,
        previousContent: note.content,
        editedBy: userId,
      });
    }

    const updated = await this.repository.update(id, {
      content: dto.content,
      visibility: dto.visibility,
      visibilityRoleKey: dto.visibilityRoleKey,
      mentionedUserIds: dto.mentionedUserIds,
      mentionedRoleKeys: dto.mentionedRoleKeys,
      isEdited: dto.content !== undefined ? true : undefined,
      editedAt: dto.content !== undefined ? new Date() : undefined,
    } as Partial<INote>);

    await this.recordActivity(workspaceId, userId, 'notes-comments.note_updated', updated);
    await this.recordAudit(workspaceId, userId, 'notes-comments.note.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(NotesCommentsEvent.NOTE_UPDATED, { workspaceId, noteId: id, actorId: userId });

    if (dto.mentionedUserIds?.length || dto.mentionedRoleKeys?.length) {
      const newlyMentioned = (dto.mentionedUserIds ?? []).filter((u) => !note.mentionedUserIds.includes(u));
      if (newlyMentioned.length > 0) {
        await this.notifyMentions(workspaceId, { ...updated, mentionedUserIds: newlyMentioned, mentionedRoleKeys: [] } as INote, userId);
      }
    }
    return updated;
  }

  // ── Pin / resolve (any viewer may toggle — collaborative actions) ──

  async pin(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    return this.toggleFlag(id, workspaceId, userId, userRole, { isPinned: true }, NotesCommentsEvent.NOTE_PINNED);
  }

  async unpin(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    return this.toggleFlag(id, workspaceId, userId, userRole, { isPinned: false }, NotesCommentsEvent.NOTE_UNPINNED);
  }

  async resolve(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    return this.toggleFlag(
      id,
      workspaceId,
      userId,
      userRole,
      { isResolved: true, resolvedBy: userId, resolvedAt: new Date() },
      NotesCommentsEvent.NOTE_RESOLVED,
    );
  }

  async unresolve(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    return this.toggleFlag(
      id,
      workspaceId,
      userId,
      userRole,
      { isResolved: false, resolvedBy: null, resolvedAt: null },
      NotesCommentsEvent.NOTE_UNRESOLVED,
    );
  }

  private async toggleFlag(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    fields: Partial<INote>,
    event: NotesCommentsEvent,
  ): Promise<INote> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    if (!(await this.canView(note, userId, userRole, workspaceId))) {
      throw new NoteAccessDeniedException();
    }

    const updated = await this.repository.update(id, fields as Partial<INote>);
    await this.publishEvent(event, { workspaceId, noteId: id, actorId: userId });
    return updated;
  }

  // ── Archive / restore / delete ────────────────────────────────────

  async archive(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);
    if (note.status === NoteStatus.ARCHIVED) {
      throw new NoteInvalidStateTransitionException(note.status, 'archive');
    }

    const updated = await this.repository.update(id, {
      status: NoteStatus.ARCHIVED,
      archivedAt: new Date(),
    } as Partial<INote>);

    await this.recordAudit(workspaceId, userId, 'notes-comments.note.archived', AuditActionCategory.DELETE, id);
    await this.publishEvent(NotesCommentsEvent.NOTE_ARCHIVED, { workspaceId, noteId: id, actorId: userId });
    return updated;
  }

  async restore(id: string, workspaceId: string, userId: string, userRole: string): Promise<INote> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);
    if (note.status !== NoteStatus.ARCHIVED) {
      throw new NoteInvalidStateTransitionException(note.status, 'restore');
    }

    const updated = await this.repository.update(id, {
      status: NoteStatus.ACTIVE,
      archivedAt: null,
    } as Partial<INote>);

    await this.recordAudit(workspaceId, userId, 'notes-comments.note.restored', AuditActionCategory.RESTORE, id);
    await this.publishEvent(NotesCommentsEvent.NOTE_RESTORED, { workspaceId, noteId: id, actorId: userId });
    return updated;
  }

  async remove(id: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);

    await this.repository.softDelete(id);
    await this.recordAudit(workspaceId, userId, 'notes-comments.note.deleted', AuditActionCategory.DELETE, id);
    await this.publishEvent(NotesCommentsEvent.NOTE_DELETED, { workspaceId, noteId: id, actorId: userId });
  }

  // ── Edit history ─────────────────────────────────────────────────

  async getEditHistory(id: string, workspaceId: string, userId: string, userRole: string): Promise<INoteEditHistory[]> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    if (!(await this.canView(note, userId, userRole, workspaceId))) {
      throw new NoteAccessDeniedException();
    }
    return this.repository.listEditHistory(id);
  }

  // ── Attachments (delegates entirely to File Management by id reference) ──

  async addAttachment(id: string, workspaceId: string, userId: string, userRole: string, dto: CreateAttachmentDto): Promise<INoteAttachment> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);

    const existing = await this.repository.findAttachment(id, dto.fileId);
    if (existing) {
      throw new NoteAttachmentAlreadyExistsException();
    }
    return this.repository.createAttachment({ noteId: id, workspaceId, fileId: dto.fileId, addedBy: userId });
  }

  async listAttachments(id: string, workspaceId: string, userId: string, userRole: string): Promise<INoteAttachment[]> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    if (!(await this.canView(note, userId, userRole, workspaceId))) {
      throw new NoteAccessDeniedException();
    }
    return this.repository.listAttachments(id);
  }

  async removeAttachment(id: string, attachmentId: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    const note = await this.getNoteOrThrow(id, workspaceId);
    await this.assertCanEdit(note, userId, workspaceId, userRole);

    const attachment = await this.repository.findAttachmentById(attachmentId);
    if (!attachment || attachment.noteId !== id) {
      throw new NoteAttachmentNotFoundException(attachmentId);
    }
    await this.repository.deleteAttachment(attachmentId);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getNoteOrThrow(id: string, workspaceId: string): Promise<INote> {
    const note = await this.repository.findById(id, workspaceId);
    if (!note) {
      throw new NoteNotFoundException(id);
    }
    return note;
  }

  private async canView(note: INote, userId: string, userRole: string, workspaceId: string): Promise<boolean> {
    if (note.authorId === userId) {
      return true;
    }
    switch (note.visibility) {
      case NoteVisibility.WORKSPACE:
        return true;
      case NoteVisibility.PRIVATE:
        return false;
      case NoteVisibility.TEAM: {
        if (!note.visibilityRoleKey) {
          return false;
        }
        if (userRole.toLowerCase() === note.visibilityRoleKey.toLowerCase()) {
          return true;
        }
        return this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, note.visibilityRoleKey);
      }
      case NoteVisibility.ENTITY_PARTICIPANTS: {
        if (note.mentionedUserIds.includes(userId)) {
          return true;
        }
        const authoredCount = await this.repository.countAuthoredOnEntity(workspaceId, note.entityType, note.entityId, userId);
        return authoredCount > 0;
      }
      default:
        return false;
    }
  }

  private async assertCanEdit(note: INote, userId: string, workspaceId: string, userRole: string): Promise<void> {
    if (note.authorId === userId) {
      return;
    }
    if (NOTES_ADMIN_ROLES.includes(userRole)) {
      return;
    }
    const hasAdminRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'admin');
    if (!hasAdminRole) {
      throw new NoteAccessDeniedException();
    }
  }

  private async notifyMentions(workspaceId: string, note: INote, actorId: string): Promise<void> {
    let mentioned = false;

    for (const targetUserId of note.mentionedUserIds) {
      if (targetUserId === actorId) {
        continue;
      }
      await this.notifyUser(workspaceId, targetUserId, 'You were mentioned', note.content.slice(0, 140));
      mentioned = true;
    }

    for (const roleKey of note.mentionedRoleKeys) {
      try {
        const dto: CreateNotificationDto = {
          workspaceId,
          targetType: NotificationTargetType.ROLE,
          targetRole: roleKey.toUpperCase(),
          type: NotificationType.INFO,
          priority: NotificationPriority.NORMAL,
          category: NOTES_COMMENTS_MODULE,
          title: 'Your role was mentioned',
          message: note.content.slice(0, 140),
          sourceModule: note.module ?? NOTES_COMMENTS_MODULE,
          entityType: note.entityType,
          entityId: note.entityId,
          actionRequired: false,
        } as CreateNotificationDto;
        await this.notificationsService.create(dto);
        mentioned = true;
      } catch (error) {
        this.logger.warn(`Failed to notify role ${roleKey}: ${(error as Error).message}`);
      }
    }

    if (mentioned) {
      await this.publishEvent(NotesCommentsEvent.MENTION_CREATED, { workspaceId, noteId: note.id, actorId });
    }
  }

  private async notifyUser(workspaceId: string, userId: string, title: string, message: string): Promise<void> {
    try {
      const dto: CreateNotificationDto = {
        workspaceId,
        targetType: NotificationTargetType.USER,
        targetUserId: userId,
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        category: NOTES_COMMENTS_MODULE,
        title,
        message,
        actionRequired: false,
      } as CreateNotificationDto;
      await this.notificationsService.create(dto);
    } catch (error) {
      this.logger.warn(`Failed to notify user ${userId}: ${(error as Error).message}`);
    }
  }

  private async recordActivity(workspaceId: string, actorId: string, action: string, note: INote): Promise<void> {
    try {
      const dto: RecordActivityDto = {
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId,
        action,
        sourceModule: note.module ?? NOTES_COMMENTS_MODULE,
        entityType: note.entityType,
        entityId: note.entityId,
        outcome: ActivityOutcome.SUCCESS,
        title: note.noteType === NoteType.NOTE ? 'Note added' : 'Comment added',
        description: note.content.slice(0, 280),
        timelineId: `notes:${note.entityType}:${note.entityId}`,
      } as RecordActivityDto;
      await this.activityCenterService.record(dto);
    } catch (error) {
      this.logger.warn(`Failed to record activity for note ${note.id}: ${(error as Error).message}`);
    }
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: NOTES_COMMENTS_MODULE,
      entityType: 'Note',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: NotesCommentsEvent,
    opts: {
      workspaceId: string;
      noteId?: string;
      module?: string;
      entityType?: string;
      entityId?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
