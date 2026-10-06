import { IWarehouseAuditLog } from '../interfaces';

export type WarehouseAuditLogResponseDto = IWarehouseAuditLog;

export interface PaginatedWarehouseAuditLogResponseDto {
  data: WarehouseAuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditActivityTimelineDto {
  entityType: string;
  entityId: string;
  activities: WarehouseAuditLogResponseDto[];
  total: number;
}

export interface AuditStatisticsDto {
  totalAudits: number;
  byAction: Record<string, number>;
  byOutcome: Record<string, number>;
  byActor: Record<string, number>;
  suspiciousCount: number;
}
