import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { INote, INoteEditHistory, INoteAttachment } from './interfaces';
import { NoteFilterDto } from './dto';

@Injectable()
export class NotesCommentsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Notes ────────────────────────────────────────────────────────

  async create(data: Partial<INote>): Promise<INote> {
    return this.prisma.note.create({ data: data as any }) as Promise<INote>;
  }

  async findById(id: string, workspaceId: string): Promise<INote | null> {
    return this.prisma.note.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<INote | null>;
  }

  async update(id: string, data: Partial<INote>): Promise<INote> {
    return this.prisma.note.update({ where: { id }, data: data as any }) as Promise<INote>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async countAuthoredOnEntity(workspaceId: string, entityType: string, entityId: string, authorId: string): Promise<number> {
    return this.prisma.note.count({
      where: { workspaceId, entityType, entityId, authorId, deletedAt: null },
    });
  }

  async findAll(workspaceId: string, filter: NoteFilterDto, restrictToIds?: string[]): Promise<[INote[], number]> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (filter.module) where.module = filter.module;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.noteType) where.noteType = filter.noteType;
    if (filter.status) where.status = filter.status;
    if (filter.authorId) where.authorId = filter.authorId;
    if (filter.parentId) where.parentId = filter.parentId;
    if (filter.topLevelOnly) where.parentId = null;
    if (filter.isPinned !== undefined) where.isPinned = filter.isPinned;
    if (filter.isResolved !== undefined) where.isResolved = filter.isResolved;
    if (restrictToIds) where.id = { in: restrictToIds };
    if (filter.search) {
      where.content = { contains: filter.search, mode: 'insensitive' };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.note.count({ where: where as any }),
    ]);

    return [data as INote[], total];
  }

  async listReplies(parentId: string): Promise<INote[]> {
    return this.prisma.note.findMany({
      where: { parentId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }) as Promise<INote[]>;
  }

  // ── Edit history (immutable) ──────────────────────────────────────

  async createEditHistory(data: Partial<INoteEditHistory>): Promise<INoteEditHistory> {
    return this.prisma.noteEditHistory.create({ data: data as any }) as Promise<INoteEditHistory>;
  }

  async listEditHistory(noteId: string): Promise<INoteEditHistory[]> {
    return this.prisma.noteEditHistory.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<INoteEditHistory[]>;
  }

  // ── Attachments ──────────────────────────────────────────────────

  async createAttachment(data: Partial<INoteAttachment>): Promise<INoteAttachment> {
    return this.prisma.noteAttachment.create({ data: data as any }) as Promise<INoteAttachment>;
  }

  async findAttachment(noteId: string, fileId: string): Promise<INoteAttachment | null> {
    return this.prisma.noteAttachment.findUnique({
      where: { noteId_fileId: { noteId, fileId } },
    }) as Promise<INoteAttachment | null>;
  }

  async findAttachmentById(id: string): Promise<INoteAttachment | null> {
    return this.prisma.noteAttachment.findUnique({ where: { id } }) as Promise<INoteAttachment | null>;
  }

  async listAttachments(noteId: string): Promise<INoteAttachment[]> {
    return this.prisma.noteAttachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<INoteAttachment[]>;
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.prisma.noteAttachment.delete({ where: { id } });
  }
}
