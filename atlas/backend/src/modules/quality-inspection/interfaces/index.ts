// =============================================================
// Quality Inspection – Interfaces & Types
// =============================================================

export enum QualityInspectionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL_APPROVAL = 'CONDITIONAL_APPROVAL',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export enum DefectSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  COSMETIC = 'COSMETIC',
}

export enum InspectionType {
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  DURING_PRODUCTION = 'DURING_PRODUCTION',
  PRE_SHIPMENT = 'PRE_SHIPMENT',
  CONTAINER_LOADING = 'CONTAINER_LOADING',
  RECEIVING = 'RECEIVING',
  IN_HOUSE = 'IN_HOUSE',
  RE_INSPECTION = 'RE_INSPECTION',
}

export enum SamplingMethod {
  AQL_1_0 = 'AQL_1_0',
  AQL_1_5 = 'AQL_1_5',
  AQL_2_5 = 'AQL_2_5',
  AQL_4_0 = 'AQL_4_0',
  FULL = 'FULL',
  RANDOM = 'RANDOM',
  CUSTOM = 'CUSTOM',
}

export enum InspectionRecommendation {
  APPROVE = 'APPROVE',
  CONDITIONALLY_APPROVE = 'CONDITIONALLY_APPROVE',
  REJECT = 'REJECT',
  RE_INSPECT = 'RE_INSPECT',
}

export interface DefectDetail {
  description: string;
  severity: DefectSeverity;
  quantity: number;
  location?: string;
  imageUrls?: string[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  passed: boolean;
  notes?: string;
}

export interface InspectionAttachment {
  name: string;
  url: string;
  type: 'image' | 'document';
  uploadedAt: string;
}

export interface IQualityInspection {
  id: string;
  workspaceId: string;
  inspectionNumber: string;
  inspectionSequence: number;
  status: QualityInspectionStatus;
  inspectionType: InspectionType;
  samplingMethod: SamplingMethod;

  // References
  shipmentId?: string | null;
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  parentInspectionId?: string | null;

  // Products (JSON array of { productId, productName, sku })
  products: unknown[];

  // Personnel
  inspector?: string | null;
  inspectorName?: string | null;

  // Scheduling
  scheduledDate?: Date | null;
  inspectionDate?: Date | null;
  completedAt?: Date | null;

  // Quantities
  quantityOrdered: number;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;

  // Quality
  defects: DefectDetail[];
  checklist: ChecklistItem[];
  qualityScore?: number | null;
  recommendation?: InspectionRecommendation | null;

  // Media
  images: string[];
  attachments: InspectionAttachment[];

  // Notes
  notes?: string | null;
  internalNotes?: string | null;
  conditionsForApproval?: string | null;
  rejectionReason?: string | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IQualityInspectionHistory {
  id: string;
  inspectionId: string;
  workspaceId: string;
  fromStatus: QualityInspectionStatus;
  toStatus: QualityInspectionStatus;
  reason?: string | null;
  changedBy?: string | null;
  metadata?: unknown;
  createdAt: Date;
}

// ── Job Payloads ────────────────────────────────────────────

export interface InspectionJobPayload {
  inspectionId: string;
  inspectionNumber: string;
  workspaceId: string;
  event: InspectionEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export enum InspectionEvent {
  CREATED = 'inspection.created',
  STARTED = 'inspection.started',
  COMPLETED = 'inspection.completed',
  PASSED = 'inspection.passed',
  FAILED = 'inspection.failed',
  CLOSED = 'inspection.closed',
}
