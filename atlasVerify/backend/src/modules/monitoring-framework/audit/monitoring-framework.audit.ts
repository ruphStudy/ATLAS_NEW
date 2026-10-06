import { Injectable, Logger } from '@nestjs/common';
import { MonitoringFrameworkRepository } from '../monitoring-framework.repository';
import { IMonitoringIncident, IMonitoringSlo } from '../interfaces';

/**
 * MonitoringFrameworkAudit
 *
 * Writes version/status-change snapshots to the append-only
 * `MonitoringSloHistory`/`MonitoringIncidentHistory` tables — mirrors
 * the versioned-history pattern used across every framework module
 * this session. Cross-cutting compliance entries are written separately
 * by `MonitoringFrameworkService` to the central `AuditLogsService`.
 */
@Injectable()
export class MonitoringFrameworkAudit {
  private readonly logger = new Logger(MonitoringFrameworkAudit.name);

  constructor(private readonly repository: MonitoringFrameworkRepository) {}

  async logSloChange(slo: IMonitoringSlo, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = slo;
      await this.repository.createSloHistory({
        sloId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for monitoring SLO '${slo.id}': ${(err as Error).message}`);
    }
  }

  async logIncidentChange(incident: IMonitoringIncident, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, status, ...rest } = incident;
      await this.repository.createIncidentHistory({
        incidentId: id,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for monitoring incident '${incident.id}': ${(err as Error).message}`);
    }
  }
}
