import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IDocument,
  IDocumentApprovalHistory,
  IDocumentComment,
  IDocumentEntityLink,
  DocumentStatus,
} from './interfaces';
import { DocumentFilterDto } from './dto';
import { DOCUMENT_EXPIRY_SCAN_LIMIT } from './constants';

/**
 * DocumentManagementRepository — the ONLY layer that touches `PrismaService`
 * for documents, approval history, comments and entity links. File bytes and
 * storage are never touched here — that stays entirely inside File
 * Management, referenced only via `Document.fileId`.
 */
@Injectable()
export class DocumentManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Documents ────────────────────────────────────────────────────

  async create(data: Partial<IDocument>): Promise<IDocument> {
    return this.prisma.document.create({ data: data as any }) as Promise<IDocument>;
  }

  async findById(id: string, workspaceId: string): Promise<IDocument | null> {
    return this.prisma.document.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IDocument | null>;
  }

  async findAll(workspaceId: string, filter: DocumentFilterDto): Promise<[IDocument[], number]> {
    const where = this.buildWhere(filter, workspaceId);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.document.count({ where: where as any }),
    ]);

    return [data as IDocument[], total];
  }

  async update(id: string, data: Partial<IDocument>): Promise<IDocument> {
    return this.prisma.document.update({
      where: { id },
      data: data as any,
    }) as Promise<IDocument>;
  }

  /** Cross-workspace scan used by the expiry scheduler — bounded so one tick can't scan an unbounded table. */
  async findExpiredAsOf(now: Date): Promise<IDocument[]> {
    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        expiresAt: { lt: now },
        status: { notIn: [DocumentStatus.EXPIRED, DocumentStatus.ARCHIVED] },
      },
      take: DOCUMENT_EXPIRY_SCAN_LIMIT,
    }) as Promise<IDocument[]>;
  }

  async findExpiringBetween(from: Date, to: Date): Promise<IDocument[]> {
    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gte: from, lte: to },
        status: { notIn: [DocumentStatus.EXPIRED, DocumentStatus.ARCHIVED] },
      },
      take: DOCUMENT_EXPIRY_SCAN_LIMIT,
    }) as Promise<IDocument[]>;
  }

  // ── Approval history ─────────────────────────────────────────────

  async createHistoryEntry(data: Partial<IDocumentApprovalHistory>): Promise<IDocumentApprovalHistory> {
    return this.prisma.documentApprovalHistory.create({
      data: data as any,
    }) as Promise<IDocumentApprovalHistory>;
  }

  async findHistory(documentId: string, workspaceId: string): Promise<IDocumentApprovalHistory[]> {
    return this.prisma.documentApprovalHistory.findMany({
      where: { documentId, workspaceId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IDocumentApprovalHistory[]>;
  }

  // ── Comments ─────────────────────────────────────────────────────

  async createComment(data: Partial<IDocumentComment>): Promise<IDocumentComment> {
    return this.prisma.documentComment.create({ data: data as any }) as Promise<IDocumentComment>;
  }

  async listComments(documentId: string, workspaceId: string): Promise<IDocumentComment[]> {
    return this.prisma.documentComment.findMany({
      where: { documentId, workspaceId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IDocumentComment[]>;
  }

  // ── Entity links ─────────────────────────────────────────────────

  async createLink(data: Partial<IDocumentEntityLink>): Promise<IDocumentEntityLink> {
    return this.prisma.documentEntityLink.create({ data: data as any }) as Promise<IDocumentEntityLink>;
  }

  async findLink(
    documentId: string,
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<IDocumentEntityLink | null> {
    return this.prisma.documentEntityLink.findFirst({
      where: { documentId, workspaceId, entityType, entityId },
    }) as Promise<IDocumentEntityLink | null>;
  }

  async listLinks(documentId: string, workspaceId: string): Promise<IDocumentEntityLink[]> {
    return this.prisma.documentEntityLink.findMany({
      where: { documentId, workspaceId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IDocumentEntityLink[]>;
  }

  async deleteLink(id: string): Promise<void> {
    await this.prisma.documentEntityLink.delete({ where: { id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private buildWhere(filter: DocumentFilterDto, workspaceId: string): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.documentType) where.documentType = filter.documentType;
    if (filter.status) where.status = filter.status;
    if (filter.sourceModule) where.sourceModule = filter.sourceModule;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.ownerId) where.ownerId = filter.ownerId;

    if (filter.startDate || filter.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filter.startDate) createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) createdAt.lte = new Date(filter.endDate);
      where.createdAt = createdAt;
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { documentNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
