import { Injectable, Logger } from '@nestjs/common';
import { FileManagementService, IDownloadedFile } from '@modules/file-management/file-management.service';
import { IssueAccessTokenDto } from '@modules/file-management/dto';
import { IFileAccessToken, IFileVersionRecord } from '@modules/file-management/interfaces';
import { DocumentManagementRepository } from './document-management.repository';
import { DocumentEventQueue } from './jobs';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddDocumentVersionDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  RequestDocumentRevisionDto,
  DocumentFilterDto,
  AddCommentDto,
  LinkEntityDto,
  PaginatedDocumentResponseDto,
} from './dto';
import {
  IDocument,
  IDocumentApprovalHistory,
  IDocumentComment,
  IDocumentEntityLink,
  DocumentStatus,
  DocumentSourceType,
  DocumentEvent,
} from './interfaces';
import {
  DocumentNotFoundException,
  DocumentAccessDeniedException,
  DocumentInvalidStateTransitionException,
  DocumentLinkAlreadyExistsException,
  DocumentLinkNotFoundException,
} from './exceptions/document.exceptions';
import {
  DOCUMENT_ALLOWED_TRANSITIONS,
  DOCUMENT_APPROVAL_ROLES,
  DOCUMENT_EXPIRY_REMINDER_DAYS_BEFORE,
} from './constants';

@Injectable()
export class DocumentManagementService {
  private readonly logger = new Logger(DocumentManagementService.name);

  constructor(
    private readonly repository: DocumentManagementRepository,
    private readonly fileManagementService: FileManagementService,
    private readonly eventQueue: DocumentEventQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(workspaceId: string, ownerId: string, dto: CreateDocumentDto): Promise<IDocument> {
    const file = await this.fileManagementService.upload(workspaceId, ownerId, {
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      contentBase64: dto.contentBase64,
      module: 'document-management',
      entityType: dto.entityType,
      entityId: dto.entityId,
    });

    const document = await this.repository.create({
      workspaceId,
      documentType: dto.documentType,
      title: dto.title,
      documentNumber: dto.documentNumber,
      ownerId,
      sourceModule: dto.sourceModule,
      entityType: dto.entityType,
      entityId: dto.entityId,
      source: dto.source ?? DocumentSourceType.UPLOADED,
      templateId: dto.templateId,
      fileId: file.id,
      status: DocumentStatus.DRAFT,
      version: 1,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      tags: dto.tags ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.repository.createHistoryEntry({
      documentId: document.id,
      workspaceId,
      fromStatus: DocumentStatus.DRAFT,
      toStatus: DocumentStatus.DRAFT,
      version: document.version,
      reason: 'Document created',
      changedBy: ownerId,
    });

    await this.publishEvent(DocumentEvent.DOCUMENT_CREATED, workspaceId, document.id, ownerId);
    return document;
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<IDocument> {
    return this.getOrThrow(id, workspaceId);
  }

  async findAll(workspaceId: string, filter: DocumentFilterDto): Promise<PaginatedDocumentResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Update / classify ─────────────────────────────────────────────

  async update(id: string, workspaceId: string, dto: UpdateDocumentDto): Promise<IDocument> {
    await this.getOrThrow(id, workspaceId);

    const updated = await this.repository.update(id, {
      documentType: dto.documentType,
      title: dto.title,
      documentNumber: dto.documentNumber,
      expiresAt: dto.expiresAt !== undefined ? new Date(dto.expiresAt) : undefined,
      tags: dto.tags,
      metadata: dto.metadata,
    } as Partial<IDocument>);

    await this.publishEvent(DocumentEvent.DOCUMENT_UPDATED, workspaceId, id);
    return updated;
  }

  // ── Versioning (delegates storage entirely to File Management) ───

  async addVersion(
    id: string,
    workspaceId: string,
    userId: string,
    dto: AddDocumentVersionDto,
  ): Promise<IDocument> {
    const document = await this.getOrThrow(id, workspaceId);

    await this.fileManagementService.addVersion(document.fileId, workspaceId, userId, {
      contentBase64: dto.contentBase64,
      changeReason: dto.changeReason,
    });

    const current = document.status;
    const updated = await this.repository.update(id, {
      version: document.version + 1,
      status: DocumentStatus.DRAFT,
      reviewedBy: null,
      reviewedAt: null,
      approvalComment: null,
      rejectionReason: null,
      revisionNotes: null,
    } as Partial<IDocument>);

    await this.repository.createHistoryEntry({
      documentId: id,
      workspaceId,
      fromStatus: current,
      toStatus: DocumentStatus.DRAFT,
      version: updated.version,
      reason: dto.changeReason ?? 'New version uploaded',
      changedBy: userId,
    });

    await this.publishEvent(DocumentEvent.DOCUMENT_VERSION_ADDED, workspaceId, id, userId);
    return updated;
  }

  async listVersions(id: string, workspaceId: string): Promise<IFileVersionRecord[]> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.fileManagementService.listVersions(document.fileId, workspaceId);
  }

  // ── Approval workflow ─────────────────────────────────────────────

  async submitForReview(id: string, workspaceId: string, userId: string): Promise<IDocument> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.UNDER_REVIEW, userId, {
      event: DocumentEvent.DOCUMENT_SUBMITTED,
      reason: 'Submitted for review',
    });
  }

  async approve(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: ApproveDocumentDto,
  ): Promise<IDocument> {
    this.assertCanApprove(userRole);
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.APPROVED, userId, {
      event: DocumentEvent.DOCUMENT_APPROVED,
      reason: dto.comment ?? 'Approved',
      extraFields: { reviewedBy: userId, reviewedAt: new Date(), approvalComment: dto.comment ?? null },
    });
  }

  async reject(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: RejectDocumentDto,
  ): Promise<IDocument> {
    this.assertCanApprove(userRole);
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.REJECTED, userId, {
      event: DocumentEvent.DOCUMENT_REJECTED,
      reason: dto.reason,
      extraFields: { reviewedBy: userId, reviewedAt: new Date(), rejectionReason: dto.reason },
    });
  }

  async requestRevision(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: RequestDocumentRevisionDto,
  ): Promise<IDocument> {
    this.assertCanApprove(userRole);
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.DRAFT, userId, {
      event: DocumentEvent.DOCUMENT_REVISION_REQUESTED,
      reason: dto.notes,
      extraFields: { reviewedBy: userId, reviewedAt: new Date(), revisionNotes: dto.notes },
    });
  }

  async archive(id: string, workspaceId: string, userId: string): Promise<IDocument> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.ARCHIVED, userId, {
      event: DocumentEvent.DOCUMENT_ARCHIVED,
      reason: 'Archived',
      extraFields: { archivedAt: new Date() },
    });
  }

  async restore(id: string, workspaceId: string, userId: string): Promise<IDocument> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.transition(document, DocumentStatus.DRAFT, userId, {
      event: DocumentEvent.DOCUMENT_RESTORED,
      reason: 'Restored',
      extraFields: { archivedAt: null },
    });
  }

  async remove(id: string, workspaceId: string, userId: string): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    await this.repository.update(id, { deletedAt: new Date() } as Partial<IDocument>);
    await this.publishEvent(DocumentEvent.DOCUMENT_DELETED, workspaceId, id, userId);
  }

  // ── Comments ───────────────────────────────────────────────────────

  async addComment(id: string, workspaceId: string, userId: string, dto: AddCommentDto): Promise<IDocumentComment> {
    await this.getOrThrow(id, workspaceId);
    const comment = await this.repository.createComment({
      documentId: id,
      workspaceId,
      authorId: userId,
      comment: dto.comment,
    });

    await this.publishEvent(DocumentEvent.DOCUMENT_COMMENTED, workspaceId, id, userId);
    return comment;
  }

  async listComments(id: string, workspaceId: string): Promise<IDocumentComment[]> {
    await this.getOrThrow(id, workspaceId);
    return this.repository.listComments(id, workspaceId);
  }

  // ── Entity links ───────────────────────────────────────────────────

  async linkEntity(
    id: string,
    workspaceId: string,
    userId: string,
    dto: LinkEntityDto,
  ): Promise<IDocumentEntityLink> {
    await this.getOrThrow(id, workspaceId);

    const existing = await this.repository.findLink(id, workspaceId, dto.entityType, dto.entityId);
    if (existing) {
      throw new DocumentLinkAlreadyExistsException();
    }

    const link = await this.repository.createLink({
      documentId: id,
      workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      linkedBy: userId,
    });

    await this.publishEvent(DocumentEvent.DOCUMENT_LINKED, workspaceId, id, userId, {
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
    return link;
  }

  async listLinks(id: string, workspaceId: string): Promise<IDocumentEntityLink[]> {
    await this.getOrThrow(id, workspaceId);
    return this.repository.listLinks(id, workspaceId);
  }

  async unlinkEntity(
    id: string,
    workspaceId: string,
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    const existing = await this.repository.findLink(id, workspaceId, entityType, entityId);
    if (!existing) {
      throw new DocumentLinkNotFoundException();
    }

    await this.repository.deleteLink(existing.id);
    await this.publishEvent(DocumentEvent.DOCUMENT_UNLINKED, workspaceId, id, userId, { entityType, entityId });
  }

  // ── Approval history ───────────────────────────────────────────────

  async getHistory(id: string, workspaceId: string): Promise<IDocumentApprovalHistory[]> {
    await this.getOrThrow(id, workspaceId);
    return this.repository.findHistory(id, workspaceId);
  }

  // ── Secure access (delegates entirely to File Management) ──────────

  async download(id: string, workspaceId: string): Promise<IDownloadedFile> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.fileManagementService.download(document.fileId, workspaceId);
  }

  async issueAccessToken(
    id: string,
    workspaceId: string,
    userId: string,
    dto: IssueAccessTokenDto,
  ): Promise<IFileAccessToken> {
    const document = await this.getOrThrow(id, workspaceId);
    return this.fileManagementService.issueAccessToken(document.fileId, workspaceId, userId, dto);
  }

  // ── Renewal ──────────────────────────────────────────────────────

  async renew(
    id: string,
    workspaceId: string,
    ownerId: string,
    dto: CreateDocumentDto,
  ): Promise<IDocument> {
    const source = await this.getOrThrow(id, workspaceId);
    const renewal = await this.create(workspaceId, ownerId, dto);

    await this.repository.update(source.id, { renewalDocumentId: renewal.id } as Partial<IDocument>);
    await this.repository.createHistoryEntry({
      documentId: source.id,
      workspaceId,
      fromStatus: source.status,
      toStatus: source.status,
      version: source.version,
      reason: `Renewed by document ${renewal.id}`,
      changedBy: ownerId,
    });

    await this.publishEvent(DocumentEvent.DOCUMENT_RENEWED, workspaceId, source.id, ownerId, {
      renewalDocumentId: renewal.id,
    });
    return renewal;
  }

  // ── Expiry (scheduler-callable; no active scheduler is wired — see module docblock) ──

  async processExpired(): Promise<number> {
    const now = new Date();
    const expiring = await this.repository.findExpiredAsOf(now);

    for (const document of expiring) {
      await this.repository.update(document.id, { status: DocumentStatus.EXPIRED } as Partial<IDocument>);
      await this.repository.createHistoryEntry({
        documentId: document.id,
        workspaceId: document.workspaceId,
        fromStatus: document.status,
        toStatus: DocumentStatus.EXPIRED,
        version: document.version,
        reason: 'Expired',
      });
      await this.publishEvent(DocumentEvent.DOCUMENT_EXPIRED, document.workspaceId, document.id);
    }

    return expiring.length;
  }

  async publishExpiringSoonReminders(): Promise<number> {
    const now = new Date();
    const reminderWindowEnd = new Date(now.getTime() + DOCUMENT_EXPIRY_REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000);
    const expiringSoon = await this.repository.findExpiringBetween(now, reminderWindowEnd);

    for (const document of expiringSoon) {
      await this.publishEvent(DocumentEvent.DOCUMENT_EXPIRING_SOON, document.workspaceId, document.id, undefined, {
        expiresAt: document.expiresAt,
      });
    }

    return expiringSoon.length;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<IDocument> {
    const document = await this.repository.findById(id, workspaceId);
    if (!document) {
      throw new DocumentNotFoundException(id);
    }
    return document;
  }

  private assertCanApprove(userRole: string): void {
    if (!DOCUMENT_APPROVAL_ROLES.includes(userRole)) {
      throw new DocumentAccessDeniedException();
    }
  }

  private assertTransition(from: DocumentStatus, to: DocumentStatus): void {
    if (!DOCUMENT_ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throw new DocumentInvalidStateTransitionException(from, to);
    }
  }

  private async transition(
    document: IDocument,
    to: DocumentStatus,
    userId: string,
    options: { event: DocumentEvent; reason: string; extraFields?: Partial<IDocument> },
  ): Promise<IDocument> {
    this.assertTransition(document.status, to);

    const updated = await this.repository.update(document.id, {
      status: to,
      ...options.extraFields,
    } as Partial<IDocument>);

    await this.repository.createHistoryEntry({
      documentId: document.id,
      workspaceId: document.workspaceId,
      fromStatus: document.status,
      toStatus: to,
      version: document.version,
      reason: options.reason,
      changedBy: userId,
    });

    await this.publishEvent(options.event, document.workspaceId, document.id, userId);
    return updated;
  }

  private async publishEvent(
    event: DocumentEvent,
    workspaceId: string,
    documentId?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, documentId, actorId, metadata });
  }
}
