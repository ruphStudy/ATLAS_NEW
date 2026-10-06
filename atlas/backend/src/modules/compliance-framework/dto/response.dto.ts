import {
  ComplianceAction,
  ComplianceRecordStatus,
  ComplianceRequirementType,
  ComplianceRuleStatus,
} from '../interfaces';

export class ComplianceRuleResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key!: string;
  name!: string;
  description?: string | null;
  requirementType!: ComplianceRequirementType | string;
  actions!: (ComplianceAction | string)[];
  countryCode?: string | null;
  region?: string | null;
  marketplaceKey?: string | null;
  productCategory?: string | null;
  supplierId?: string | null;
  warehouseId?: string | null;
  businessType?: string | null;
  mandatory!: boolean;
  thresholds!: Record<string, unknown>;
  exemptionCodes!: string[];
  renewalPeriodDays?: number | null;
  reminderDaysBeforeExpiry?: number | null;
  priority!: number;
  status!: ComplianceRuleStatus;
  version!: number;
  supersedesId?: string | null;
  effectiveFrom!: Date;
  effectiveTo?: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedComplianceRuleResponseDto {
  data!: ComplianceRuleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ComplianceRuleHistoryResponseDto {
  id!: string;
  ruleId!: string;
  status!: ComplianceRuleStatus | string;
  version!: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class ComplianceRecordResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId?: string | null;
  ruleId!: string;
  ruleKey!: string;
  ruleVersion!: number;
  subjectType!: string;
  subjectId!: string;
  status!: ComplianceRecordStatus;
  referenceNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  evidenceDocumentId?: string | null;
  evaluationSnapshot!: Record<string, unknown>;
  lastCheckedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  decisionReason?: string | null;
  isOverride!: boolean;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedComplianceRecordResponseDto {
  data!: ComplianceRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ComplianceRecordHistoryResponseDto {
  id!: string;
  recordId!: string;
  fromStatus?: string | null;
  toStatus!: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}
