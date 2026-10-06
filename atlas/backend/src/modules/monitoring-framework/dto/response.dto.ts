export class MonitoringSloResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  service!: string;
  dimension!: string;
  targetValue!: number;
  warningThreshold!: number;
  criticalThreshold!: number;
  windowMinutes!: number;
  version!: number;
  status!: string;
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MonitoringSloResponseDto {
    const dto = new MonitoringSloResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedMonitoringSloResponseDto {
  data!: MonitoringSloResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedMonitoringSloResponseDto {
    const dto = new PaginatedMonitoringSloResponseDto();
    dto.data = items.map((i) => MonitoringSloResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class MonitoringAlertRuleResponseDto {
  id!: string;
  workspaceId?: string | null;
  sloId?: string | null;
  sourceKey!: string;
  service?: string | null;
  dimension?: string | null;
  conditionField!: string;
  conditionOperator!: string;
  conditionValue: unknown;
  severity!: string;
  cooldownMinutes!: number;
  status!: string;
  lastTriggeredAt?: Date | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): MonitoringAlertRuleResponseDto {
    const dto = new MonitoringAlertRuleResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedMonitoringAlertRuleResponseDto {
  data!: MonitoringAlertRuleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedMonitoringAlertRuleResponseDto {
    const dto = new PaginatedMonitoringAlertRuleResponseDto();
    dto.data = items.map((i) => MonitoringAlertRuleResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class MonitoringIncidentResponseDto {
  id!: string;
  workspaceId?: string | null;
  sourceKeys!: string[];
  service?: string | null;
  severity!: string;
  status!: string;
  correlationId?: string | null;
  title!: string;
  description?: string | null;
  openedAt!: Date;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  durationMs?: number | null;

  static from(raw: Record<string, unknown>): MonitoringIncidentResponseDto {
    const dto = new MonitoringIncidentResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedMonitoringIncidentResponseDto {
  data!: MonitoringIncidentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedMonitoringIncidentResponseDto {
    const dto = new PaginatedMonitoringIncidentResponseDto();
    dto.data = items.map((i) => MonitoringIncidentResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}
