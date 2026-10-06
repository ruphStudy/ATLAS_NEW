import { UserRole } from '@prisma/client';
import { DocumentStatus } from '../interfaces';

/** Roles permitted to approve, reject or request revision on a document. */
export const DOCUMENT_APPROVAL_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];

/** Allowed `DocumentStatus` transitions — mirrors the Listing Approval workflow's transition-map pattern. */
export const DOCUMENT_ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  [DocumentStatus.DRAFT]: [DocumentStatus.UNDER_REVIEW, DocumentStatus.ARCHIVED],
  [DocumentStatus.UNDER_REVIEW]: [
    DocumentStatus.APPROVED,
    DocumentStatus.REJECTED,
    DocumentStatus.DRAFT,
    DocumentStatus.ARCHIVED,
  ],
  [DocumentStatus.APPROVED]: [DocumentStatus.ARCHIVED, DocumentStatus.EXPIRED, DocumentStatus.DRAFT],
  [DocumentStatus.REJECTED]: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
  [DocumentStatus.EXPIRED]: [DocumentStatus.ARCHIVED, DocumentStatus.DRAFT],
  [DocumentStatus.ARCHIVED]: [DocumentStatus.DRAFT],
};

/** How many days before `expiresAt` a DOCUMENT_EXPIRING_SOON reminder event is published. */
export const DOCUMENT_EXPIRY_REMINDER_DAYS_BEFORE = 7;

/** Cap on rows scanned per expiry-scheduler tick, so one run can't scan an unbounded table. */
export const DOCUMENT_EXPIRY_SCAN_LIMIT = 500;

export const DOCUMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'expiresAt'] as const;
