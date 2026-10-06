export enum ProcurementStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IProcurement {
  id: string;
  workspaceId: string;
  procurementNumber: string;
  procurementSequence: number;
  productId?: string | null;
  supplierId?: string | null;
  rfqId?: string | null;
  quotationComparisonId?: string | null;
  status: ProcurementStatus;
  quantity: number;
  agreedUnitCost: number;
  totalCost: number;
  currency: string;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryDate?: Date | null;
  procurementOwner?: string | null;
  notes?: string | null;
  attachments?: ProcurementAttachment[] | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  orderedAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IProcurementHistory {
  id: string;
  procurementId: string;
  workspaceId: string;
  fromStatus: ProcurementStatus;
  toStatus: ProcurementStatus;
  changedBy: string;
  reason?: string | null;
  createdAt: Date;
}

export interface ProcurementAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ProcurementJobPayload {
  procurementId: string;
  procurementNumber: string;
  workspaceId: string;
  event: string;
  changedBy?: string;
}
