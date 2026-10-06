export enum DocumentType {
  SUPPLIER = 'SUPPLIER',
  PROCUREMENT = 'PROCUREMENT',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  SHIPMENT = 'SHIPMENT',
  QUALITY = 'QUALITY',
  PRODUCT = 'PRODUCT',
  MARKETPLACE = 'MARKETPLACE',
  WAREHOUSE = 'WAREHOUSE',
  FINANCE = 'FINANCE',
  SAAS = 'SAAS',
  OTHER = 'OTHER',
}

export enum DocumentSourceType {
  UPLOADED = 'UPLOADED',
  GENERATED = 'GENERATED',
  TEMPLATE = 'TEMPLATE',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentEvent {
  DOCUMENT_CREATED = 'document-management.created',
  DOCUMENT_UPDATED = 'document-management.updated',
  DOCUMENT_VERSION_ADDED = 'document-management.version_added',
  DOCUMENT_SUBMITTED = 'document-management.submitted',
  DOCUMENT_APPROVED = 'document-management.approved',
  DOCUMENT_REJECTED = 'document-management.rejected',
  DOCUMENT_REVISION_REQUESTED = 'document-management.revision_requested',
  DOCUMENT_ARCHIVED = 'document-management.archived',
  DOCUMENT_RESTORED = 'document-management.restored',
  DOCUMENT_DELETED = 'document-management.deleted',
  DOCUMENT_EXPIRED = 'document-management.expired',
  DOCUMENT_EXPIRING_SOON = 'document-management.expiring_soon',
  DOCUMENT_RENEWED = 'document-management.renewed',
  DOCUMENT_COMMENTED = 'document-management.commented',
  DOCUMENT_LINKED = 'document-management.linked',
  DOCUMENT_UNLINKED = 'document-management.unlinked',
}

export interface IDocument {
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
  deletedAt?: Date | null;
}

export interface IDocumentApprovalHistory {
  id: string;
  documentId: string;
  workspaceId: string;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IDocumentComment {
  id: string;
  documentId: string;
  workspaceId: string;
  authorId?: string | null;
  comment: string;
  createdAt: Date;
}

export interface IDocumentEntityLink {
  id: string;
  documentId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  linkedBy?: string | null;
  createdAt: Date;
}

export interface IDocumentEventPayload {
  event: DocumentEvent;
  workspaceId: string;
  documentId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
