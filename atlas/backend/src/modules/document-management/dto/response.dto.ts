import { DocumentType, DocumentSourceType, DocumentStatus } from '../interfaces';

export class DocumentResponseDto {
  id: string;
  workspaceId: string;
  documentType: DocumentType;
  title: string;
  documentNumber?: string | null;
  ownerId?: string | null;
  sourceModule?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  source: DocumentSourceType;
  templateId?: string | null;
  fileId: string;
  status: DocumentStatus;
  version: number;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  revisionNotes?: string | null;
  expiresAt?: Date | null;
  renewalDocumentId?: string | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export class PaginatedDocumentResponseDto {
  data: DocumentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class DocumentApprovalHistoryResponseDto {
  id: string;
  documentId: string;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class DocumentCommentResponseDto {
  id: string;
  documentId: string;
  authorId?: string | null;
  comment: string;
  createdAt: Date;
}

export class DocumentEntityLinkResponseDto {
  id: string;
  documentId: string;
  entityType: string;
  entityId: string;
  linkedBy?: string | null;
  createdAt: Date;
}
