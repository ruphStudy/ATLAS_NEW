import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  QualityInspectionStatus,
  InspectionType,
  SamplingMethod,
  InspectionRecommendation,
} from '../interfaces';

export class QualityInspectionHistoryResponseDto {
  id!: string;
  inspectionId!: string;
  workspaceId!: string;
  fromStatus!: QualityInspectionStatus;
  toStatus!: QualityInspectionStatus;
  reason?: string | null;
  changedBy?: string | null;
  metadata?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): QualityInspectionHistoryResponseDto {
    const dto = new QualityInspectionHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.inspectionId = raw['inspectionId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as QualityInspectionStatus;
    dto.toStatus = raw['toStatus'] as QualityInspectionStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.metadata = raw['metadata'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class QualityInspectionResponseDto {
  id!: string;
  workspaceId!: string;
  inspectionNumber!: string;
  inspectionSequence!: number;
  status!: QualityInspectionStatus;
  inspectionType!: InspectionType;
  samplingMethod!: SamplingMethod;

  shipmentId?: string | null;
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  parentInspectionId?: string | null;

  products!: unknown[];
  inspector?: string | null;
  inspectorName?: string | null;

  scheduledDate?: Date | null;
  inspectionDate?: Date | null;
  completedAt?: Date | null;

  quantityOrdered!: number;
  quantityInspected!: number;
  quantityPassed!: number;
  quantityFailed!: number;

  defects!: unknown[];
  checklist!: unknown[];
  qualityScore?: number | null;
  @ApiPropertyOptional({ enum: InspectionRecommendation, nullable: true })
  recommendation?: InspectionRecommendation | null;

  images!: unknown[];
  attachments!: unknown[];

  notes?: string | null;
  internalNotes?: string | null;
  conditionsForApproval?: string | null;
  rejectionReason?: string | null;

  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): QualityInspectionResponseDto {
    const dto = new QualityInspectionResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inspectionNumber = raw['inspectionNumber'] as string;
    dto.inspectionSequence = raw['inspectionSequence'] as number;
    dto.status = raw['status'] as QualityInspectionStatus;
    dto.inspectionType = raw['inspectionType'] as InspectionType;
    dto.samplingMethod = raw['samplingMethod'] as SamplingMethod;
    dto.shipmentId = (raw['shipmentId'] as string | null) ?? null;
    dto.purchaseOrderId = (raw['purchaseOrderId'] as string | null) ?? null;
    dto.supplierId = (raw['supplierId'] as string | null) ?? null;
    dto.parentInspectionId = (raw['parentInspectionId'] as string | null) ?? null;
    dto.products = (raw['products'] as unknown[]) ?? [];
    dto.inspector = (raw['inspector'] as string | null) ?? null;
    dto.inspectorName = (raw['inspectorName'] as string | null) ?? null;
    dto.scheduledDate = (raw['scheduledDate'] as Date | null) ?? null;
    dto.inspectionDate = (raw['inspectionDate'] as Date | null) ?? null;
    dto.completedAt = (raw['completedAt'] as Date | null) ?? null;
    dto.quantityOrdered = raw['quantityOrdered'] as number;
    dto.quantityInspected = (raw['quantityInspected'] as number) ?? 0;
    dto.quantityPassed = (raw['quantityPassed'] as number) ?? 0;
    dto.quantityFailed = (raw['quantityFailed'] as number) ?? 0;
    dto.defects = (raw['defects'] as unknown[]) ?? [];
    dto.checklist = (raw['checklist'] as unknown[]) ?? [];
    dto.qualityScore = (raw['qualityScore'] as number | null) ?? null;
    dto.recommendation = (raw['recommendation'] as InspectionRecommendation | null) ?? null;
    dto.images = (raw['images'] as unknown[]) ?? [];
    dto.attachments = (raw['attachments'] as unknown[]) ?? [];
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.internalNotes = (raw['internalNotes'] as string | null) ?? null;
    dto.conditionsForApproval = (raw['conditionsForApproval'] as string | null) ?? null;
    dto.rejectionReason = (raw['rejectionReason'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class QualityInspectionListResponseDto {
  data!: QualityInspectionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): QualityInspectionListResponseDto {
    const dto = new QualityInspectionListResponseDto();
    dto.data = items.map(QualityInspectionResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class QualityInspectionStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  averageQualityScore!: number;
  passRate!: number;
  failRate!: number;
}
