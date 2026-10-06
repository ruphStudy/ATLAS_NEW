import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IMonitoringSlo,
  IMonitoringSloHistory,
  IMonitoringAlertRule,
  IMonitoringIncident,
  IMonitoringIncidentHistory,
  IMonitoringCorrelationEvent,
  IMonitoringSloFilterOptions,
  IMonitoringAlertRuleFilterOptions,
  IMonitoringIncidentFilterOptions,
} from './interfaces';
import { MONITORING_FRAMEWORK_CONSTANTS } from './constants';

@Injectable()
export class MonitoringFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── SLOs ──────────────────────────────────────────────────────

  async createSlo(data: Partial<IMonitoringSlo>): Promise<IMonitoringSlo> {
    return this.prisma.monitoringSlo.create({ data: data as any }) as Promise<IMonitoringSlo>;
  }

  async findSloById(id: string): Promise<IMonitoringSlo | null> {
    return this.prisma.monitoringSlo.findFirst({ where: { id, deletedAt: null } }) as Promise<IMonitoringSlo | null>;
  }

  async findActiveSlo(workspaceId: string | null, service: string, dimension: string): Promise<IMonitoringSlo | null> {
    return this.prisma.monitoringSlo.findFirst({ where: { workspaceId, service, dimension, deletedAt: null } }) as Promise<IMonitoringSlo | null>;
  }

  async updateSlo(id: string, data: Partial<IMonitoringSlo>): Promise<IMonitoringSlo> {
    return this.prisma.monitoringSlo.update({ where: { id }, data: data as any }) as Promise<IMonitoringSlo>;
  }

  async findSlos(filter: IMonitoringSloFilterOptions): Promise<[IMonitoringSlo[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.OR = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    if (filter.service) where.service = filter.service;
    if (filter.status) where.status = filter.status;

    const take = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = MONITORING_FRAMEWORK_CONSTANTS.SLO_SORT_FIELDS.includes((filter.sortBy ?? 'createdAt') as any) ? (filter.sortBy ?? 'createdAt') : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.monitoringSlo.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.monitoringSlo.count({ where: where as any }),
    ]);
    return [items as IMonitoringSlo[], total];
  }

  async createSloHistory(data: Partial<IMonitoringSloHistory>): Promise<IMonitoringSloHistory> {
    return this.prisma.monitoringSloHistory.create({ data: data as any }) as Promise<IMonitoringSloHistory>;
  }

  async findSloHistory(sloId: string): Promise<IMonitoringSloHistory[]> {
    return this.prisma.monitoringSloHistory.findMany({ where: { sloId }, orderBy: { createdAt: 'desc' } }) as Promise<IMonitoringSloHistory[]>;
  }

  // ── Alert rules ───────────────────────────────────────────────

  async createAlertRule(data: Partial<IMonitoringAlertRule>): Promise<IMonitoringAlertRule> {
    return this.prisma.monitoringAlertRule.create({ data: data as any }) as Promise<IMonitoringAlertRule>;
  }

  async findAlertRuleById(id: string): Promise<IMonitoringAlertRule | null> {
    return this.prisma.monitoringAlertRule.findFirst({ where: { id, deletedAt: null } }) as Promise<IMonitoringAlertRule | null>;
  }

  async updateAlertRule(id: string, data: Partial<IMonitoringAlertRule>): Promise<IMonitoringAlertRule> {
    return this.prisma.monitoringAlertRule.update({ where: { id }, data: data as any }) as Promise<IMonitoringAlertRule>;
  }

  async findAlertRules(filter: IMonitoringAlertRuleFilterOptions): Promise<[IMonitoringAlertRule[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.OR = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    if (filter.sourceKey) where.sourceKey = filter.sourceKey;
    if (filter.status) where.status = filter.status;

    const take = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = MONITORING_FRAMEWORK_CONSTANTS.ALERT_RULE_SORT_FIELDS.includes((filter.sortBy ?? 'createdAt') as any) ? (filter.sortBy ?? 'createdAt') : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.monitoringAlertRule.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.monitoringAlertRule.count({ where: where as any }),
    ]);
    return [items as IMonitoringAlertRule[], total];
  }

  /** All ACTIVE alert rules for a source key — the candidate set for one evaluation tick. */
  async findActiveAlertRulesForSource(sourceKey: string): Promise<IMonitoringAlertRule[]> {
    return this.prisma.monitoringAlertRule.findMany({
      where: { sourceKey, status: 'ACTIVE' as any, deletedAt: null },
      take: MONITORING_FRAMEWORK_CONSTANTS.SCAN_LIMIT,
    }) as Promise<IMonitoringAlertRule[]>;
  }

  // ── Incidents ─────────────────────────────────────────────────

  async createIncident(data: Partial<IMonitoringIncident>): Promise<IMonitoringIncident> {
    return this.prisma.monitoringIncident.create({ data: data as any }) as Promise<IMonitoringIncident>;
  }

  async findIncidentById(id: string): Promise<IMonitoringIncident | null> {
    return this.prisma.monitoringIncident.findFirst({ where: { id } }) as Promise<IMonitoringIncident | null>;
  }

  async findOpenIncident(workspaceId: string | null, service: string | null, alertRuleId: string | null): Promise<IMonitoringIncident | null> {
    return this.prisma.monitoringIncident.findFirst({
      where: { workspaceId, service, alertRuleId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } as any },
      orderBy: { openedAt: 'desc' },
    }) as Promise<IMonitoringIncident | null>;
  }

  async updateIncident(id: string, data: Partial<IMonitoringIncident>): Promise<IMonitoringIncident> {
    return this.prisma.monitoringIncident.update({ where: { id }, data: data as any }) as Promise<IMonitoringIncident>;
  }

  async findIncidents(filter: IMonitoringIncidentFilterOptions): Promise<[IMonitoringIncident[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId !== undefined) where.workspaceId = filter.workspaceId;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;

    const take = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = MONITORING_FRAMEWORK_CONSTANTS.INCIDENT_SORT_FIELDS.includes((filter.sortBy ?? 'openedAt') as any) ? (filter.sortBy ?? 'openedAt') : 'openedAt';

    const [items, total] = await Promise.all([
      this.prisma.monitoringIncident.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.monitoringIncident.count({ where: where as any }),
    ]);
    return [items as IMonitoringIncident[], total];
  }

  async countOpenIncidents(workspaceId: string | null): Promise<number> {
    return this.prisma.monitoringIncident.count({ where: { workspaceId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } as any } });
  }

  async createIncidentHistory(data: Partial<IMonitoringIncidentHistory>): Promise<IMonitoringIncidentHistory> {
    return this.prisma.monitoringIncidentHistory.create({ data: data as any }) as Promise<IMonitoringIncidentHistory>;
  }

  async findIncidentHistory(incidentId: string): Promise<IMonitoringIncidentHistory[]> {
    return this.prisma.monitoringIncidentHistory.findMany({ where: { incidentId }, orderBy: { createdAt: 'desc' } }) as Promise<IMonitoringIncidentHistory[]>;
  }

  // ── Correlation events ────────────────────────────────────────

  async createCorrelationEvent(data: Partial<IMonitoringCorrelationEvent>): Promise<IMonitoringCorrelationEvent> {
    return this.prisma.monitoringCorrelationEvent.create({ data: data as any }) as Promise<IMonitoringCorrelationEvent>;
  }

  async findCorrelationEvents(correlationId: string): Promise<IMonitoringCorrelationEvent[]> {
    return this.prisma.monitoringCorrelationEvent.findMany({ where: { correlationId }, orderBy: { occurredAt: 'asc' } }) as Promise<IMonitoringCorrelationEvent[]>;
  }
}
