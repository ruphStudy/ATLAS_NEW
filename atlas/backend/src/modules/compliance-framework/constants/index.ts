import { UserRole } from '@prisma/client';
import { ComplianceRecordStatus, ComplianceRuleStatus } from '../interfaces';

export const COMPLIANCE_FRAMEWORK_MODULE = 'compliance-framework';

/** Roles permitted to review, approve, reject, waive or override a compliance record. */
export const COMPLIANCE_APPROVAL_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];

/** Allowed `ComplianceRuleStatus` transitions. */
export const COMPLIANCE_RULE_ALLOWED_TRANSITIONS: Record<ComplianceRuleStatus, ComplianceRuleStatus[]> = {
  [ComplianceRuleStatus.DRAFT]: [ComplianceRuleStatus.ACTIVE, ComplianceRuleStatus.ARCHIVED],
  [ComplianceRuleStatus.ACTIVE]: [ComplianceRuleStatus.ARCHIVED],
  [ComplianceRuleStatus.ARCHIVED]: [],
};

/** Allowed `ComplianceRecordStatus` transitions. */
export const COMPLIANCE_RECORD_ALLOWED_TRANSITIONS: Record<ComplianceRecordStatus, ComplianceRecordStatus[]> = {
  [ComplianceRecordStatus.REQUIRED]: [
    ComplianceRecordStatus.PENDING,
    ComplianceRecordStatus.WAIVED,
    ComplianceRecordStatus.NON_APPLICABLE,
    ComplianceRecordStatus.REJECTED,
  ],
  [ComplianceRecordStatus.PENDING]: [
    ComplianceRecordStatus.COMPLIANT,
    ComplianceRecordStatus.REJECTED,
    ComplianceRecordStatus.WAIVED,
    ComplianceRecordStatus.NON_APPLICABLE,
  ],
  [ComplianceRecordStatus.COMPLIANT]: [
    ComplianceRecordStatus.EXPIRING,
    ComplianceRecordStatus.EXPIRED,
    ComplianceRecordStatus.PENDING,
    ComplianceRecordStatus.WAIVED,
    ComplianceRecordStatus.NON_APPLICABLE,
  ],
  [ComplianceRecordStatus.EXPIRING]: [
    ComplianceRecordStatus.EXPIRED,
    ComplianceRecordStatus.COMPLIANT,
    ComplianceRecordStatus.PENDING,
    ComplianceRecordStatus.WAIVED,
  ],
  [ComplianceRecordStatus.EXPIRED]: [
    ComplianceRecordStatus.PENDING,
    ComplianceRecordStatus.COMPLIANT,
    ComplianceRecordStatus.WAIVED,
    ComplianceRecordStatus.NON_APPLICABLE,
  ],
  [ComplianceRecordStatus.REJECTED]: [ComplianceRecordStatus.PENDING, ComplianceRecordStatus.WAIVED],
  [ComplianceRecordStatus.WAIVED]: [ComplianceRecordStatus.PENDING],
  [ComplianceRecordStatus.NON_APPLICABLE]: [ComplianceRecordStatus.PENDING],
};

/** How many days before `expiresAt` a COMPLIANCE_EXPIRING reminder fires, when a rule doesn't configure its own. */
export const COMPLIANCE_DEFAULT_REMINDER_DAYS_BEFORE = 30;

/** Cap on rows scanned per expiry-scheduler tick, so one run can't scan an unbounded table. */
export const COMPLIANCE_EXPIRY_SCAN_LIMIT = 500;

export const COMPLIANCE_RULE_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'priority'] as const;
export const COMPLIANCE_RECORD_SORT_FIELDS = ['createdAt', 'updatedAt', 'expiresAt', 'status'] as const;

/** Active-rule cache entry TTL — short enough that a missed invalidation self-heals quickly. */
export const COMPLIANCE_CACHE_TTL_MS = 5 * 60 * 1000;
export const COMPLIANCE_CACHE_MAX_ENTRIES = 500;
