// =============================================================
// Compliance Framework – Core Interfaces & Enums
//
// A central, configuration-driven layer that tracks compliance
// requirements (registrations, licenses, certifications, declarations,
// documents, policies) across country, region, marketplace, product
// category, supplier, warehouse and business-type scopes, and gates
// regulated actions (supplier approval, procurement, listing,
// marketplace publishing, warehouse operations) on their status.
// No country/marketplace regulation is ever hardcoded — every rule
// is data resolved at evaluation time.
// =============================================================

export enum ComplianceRequirementType {
  REGISTRATION = 'REGISTRATION',
  LICENSE = 'LICENSE',
  CERTIFICATION = 'CERTIFICATION',
  DECLARATION = 'DECLARATION',
  DOCUMENT = 'DOCUMENT',
  POLICY = 'POLICY',
}

export enum ComplianceAction {
  SUPPLIER_APPROVAL = 'SUPPLIER_APPROVAL',
  PROCUREMENT = 'PROCUREMENT',
  LISTING = 'LISTING',
  MARKETPLACE_PUBLISHING = 'MARKETPLACE_PUBLISHING',
  WAREHOUSE_OPERATION = 'WAREHOUSE_OPERATION',
  OTHER = 'OTHER',
}

export enum ComplianceSubjectType {
  SUPPLIER = 'SUPPLIER',
  WAREHOUSE = 'WAREHOUSE',
  MARKETPLACE_LISTING = 'MARKETPLACE_LISTING',
  PRODUCT = 'PRODUCT',
  ORGANIZATION = 'ORGANIZATION',
  PROCUREMENT_ORDER = 'PROCUREMENT_ORDER',
  OTHER = 'OTHER',
}

export enum ComplianceRuleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ComplianceRecordStatus {
  REQUIRED = 'REQUIRED',
  PENDING = 'PENDING',
  COMPLIANT = 'COMPLIANT',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
  WAIVED = 'WAIVED',
  NON_APPLICABLE = 'NON_APPLICABLE',
}

export enum ComplianceIssueType {
  MISSING_REQUIREMENT = 'MISSING_REQUIREMENT',
  CONFLICTING_RULES = 'CONFLICTING_RULES',
  EXPIRED_RECORD = 'EXPIRED_RECORD',
  INVALID_RULE_CONFIGURATION = 'INVALID_RULE_CONFIGURATION',
}

export enum ComplianceFrameworkEvent {
  RULE_CREATED = 'compliance-framework.rule_created',
  RULE_UPDATED = 'compliance-framework.rule_updated',
  RULE_ACTIVATED = 'compliance-framework.rule_activated',
  RULE_ARCHIVED = 'compliance-framework.rule_archived',
  COMPLIANCE_REQUIRED = 'compliance-framework.compliance_required',
  COMPLIANCE_EVIDENCE_SUBMITTED = 'compliance-framework.evidence_submitted',
  COMPLIANCE_APPROVED = 'compliance-framework.compliance_approved',
  COMPLIANCE_FAILED = 'compliance-framework.compliance_failed',
  COMPLIANCE_WAIVED = 'compliance-framework.compliance_waived',
  COMPLIANCE_OVERRIDDEN = 'compliance-framework.compliance_overridden',
  COMPLIANCE_EXPIRING = 'compliance-framework.compliance_expiring',
  COMPLIANCE_EXPIRED = 'compliance-framework.compliance_expired',
}

// ── Core Entities ─────────────────────────────────────────────

export interface IComplianceRequirementRule {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  requirementType: ComplianceRequirementType | string;
  actions: (ComplianceAction | string)[];
  countryCode?: string | null;
  region?: string | null;
  marketplaceKey?: string | null;
  productCategory?: string | null;
  supplierId?: string | null;
  warehouseId?: string | null;
  businessType?: string | null;
  mandatory: boolean;
  thresholds: Record<string, unknown>;
  exemptionCodes: string[];
  renewalPeriodDays?: number | null;
  reminderDaysBeforeExpiry?: number | null;
  priority: number;
  status: ComplianceRuleStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IComplianceRequirementRuleHistory {
  id: string;
  ruleId: string;
  workspaceId?: string | null;
  status: ComplianceRuleStatus | string;
  version: number;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IComplianceRecord {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  ruleId: string;
  ruleKey: string;
  ruleVersion: number;
  subjectType: ComplianceSubjectType | string;
  subjectId: string;
  status: ComplianceRecordStatus;
  referenceNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  evidenceDocumentId?: string | null;
  evaluationSnapshot: Record<string, unknown>;
  lastCheckedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  decisionReason?: string | null;
  isOverride: boolean;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IComplianceRecordHistory {
  id: string;
  recordId: string;
  workspaceId: string;
  fromStatus?: ComplianceRecordStatus | string | null;
  toStatus: ComplianceRecordStatus | string;
  reason?: string | null;
  changedBy?: string | null;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}

// ── Validation / Evaluation ───────────────────────────────────

export interface IComplianceEvaluationContext {
  workspaceId: string;
  organizationId?: string | null;
  action: ComplianceAction | string;
  subjectType: ComplianceSubjectType | string;
  subjectId: string;
  countryCode?: string | null;
  region?: string | null;
  marketplaceKey?: string | null;
  productCategory?: string | null;
  supplierId?: string | null;
  warehouseId?: string | null;
  businessType?: string | null;
  exemptionCodes?: string[];
}

export interface IComplianceRequirementOutcome {
  ruleId: string;
  ruleKey: string;
  name: string;
  requirementType: ComplianceRequirementType | string;
  mandatory: boolean;
  status: ComplianceRecordStatus;
  recordId?: string | null;
  reason?: string | null;
}

export interface IComplianceIssue {
  type: ComplianceIssueType;
  ruleKey?: string;
  message: string;
}

export interface IComplianceValidationResult {
  compliant: boolean;
  requirements: IComplianceRequirementOutcome[];
  blockingRequirements: IComplianceRequirementOutcome[];
  issues: IComplianceIssue[];
  warnings: string[];
  evaluatedAt: Date;
}

// ── Filters ───────────────────────────────────────────────────

export interface ComplianceRuleFilterOptions {
  workspaceId?: string | null;
  key?: string | null;
  requirementType?: ComplianceRequirementType | string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  status?: ComplianceRuleStatus | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ComplianceRecordFilterOptions {
  workspaceId?: string | null;
  ruleId?: string | null;
  ruleKey?: string | null;
  subjectType?: ComplianceSubjectType | string | null;
  subjectId?: string | null;
  status?: ComplianceRecordStatus | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface IComplianceFrameworkEventPayload {
  event: ComplianceFrameworkEvent;
  workspaceId?: string | null;
  ruleId?: string | null;
  recordId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
