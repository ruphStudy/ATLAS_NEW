import { VERIFICATION_CONSTANTS } from '../constants';

export enum VerificationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export enum VerificationCheckStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

// ── Rule Configuration ────────────────────────────────────────

export interface IVerificationRule {
  enabled: boolean;
  weight: number;   // contribution to total score (e.g. 20 means 20%)
  required: boolean; // if true and FAILED → status becomes REJECTED regardless of score
}

export interface IVerificationRules {
  businessRegistration: IVerificationRule;
  gstVat: IVerificationRule;
  contactInfo: IVerificationRule;
  websiteAvailability: IVerificationRule;
  emailValidity: IVerificationRule;
  phoneValidity: IVerificationRule;
  businessAge: IVerificationRule;
  productCatalog: IVerificationRule;
  profileCompleteness: IVerificationRule;
  scoreThreshold: number;
}

export function getDefaultVerificationRules(): IVerificationRules {
  return {
    businessRegistration: { enabled: true, weight: 20, required: true },
    gstVat:               { enabled: true, weight: 15, required: false },
    contactInfo:          { enabled: true, weight: 15, required: true },
    websiteAvailability:  { enabled: true, weight: 10, required: false },
    emailValidity:        { enabled: true, weight: 10, required: false },
    phoneValidity:        { enabled: true, weight: 10, required: false },
    businessAge:          { enabled: true, weight: 10, required: false },
    productCatalog:       { enabled: true, weight: 5,  required: false },
    profileCompleteness:  { enabled: true, weight: 5,  required: false },
    scoreThreshold: VERIFICATION_CONSTANTS.DEFAULT_SCORE_THRESHOLD,
  };
}

// ── Entity Interfaces ─────────────────────────────────────────

export interface ISupplierVerification {
  id: string;
  workspaceId: string;
  supplierId: string;
  status: VerificationStatus;
  score: number | null;
  scoreThreshold: number;
  isLatest: boolean;
  overrideNotes: string | null;
  overriddenBy: string | null;
  overriddenAt: Date | null;
  completedAt: Date | null;
  rulesSnapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationCheckResult {
  id: string;
  verificationId: string;
  checkName: string;
  status: VerificationCheckStatus;
  weight: number;
  score: number;
  message: string | null;
  details: Record<string, unknown>;
  executedAt: Date | null;
  createdAt: Date;
}

// ── Check Execution Interfaces ────────────────────────────────

export interface ICheckResult {
  passed: boolean;
  score: number;       // partial score for this check (0–100)
  message: string;
  details: Record<string, unknown>;
}

export interface ISupplierForVerification {
  id: string;
  name: string;
  provider: string;
  providerSupplierId: string | null;
  country: string;
  city: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  categories: string[];
  minOrderQuantity: number | null;
  avgLeadTimeDays: number | null;
  overallRating: number | null;
  rawData: Record<string, unknown>;
}

export interface IVerificationContext {
  workspaceId: string;
  rules: IVerificationRules;
}

export interface IVerificationCheck {
  readonly checkName: string;
  readonly defaultWeight: number;
  readonly defaultRequired: boolean;
  execute(
    supplier: ISupplierForVerification,
    context: IVerificationContext,
  ): Promise<ICheckResult>;
}

export interface IVerificationListResult {
  items: ISupplierVerification[];
  total: number;
  page: number;
  limit: number;
}

export interface IVerificationWithChecks extends ISupplierVerification {
  checkResults: IVerificationCheckResult[];
}
