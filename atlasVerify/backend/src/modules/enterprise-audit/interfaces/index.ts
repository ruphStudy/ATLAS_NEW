import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasIncidentStatus, SaasIncidentType } from '@modules/saas-audit/interfaces';

// Re-exported so callers of this module don't also need to import from
// Audit Logs / SaaS Audit directly — same enums, not redeclared
// equivalents, per "reuse existing... patterns" / "do not create a
// parallel audit system".
export { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel, SaasIncidentStatus, SaasIncidentType };

export enum EnterpriseAuditEvent {
  ENTERPRISE_AUDIT_RECORDED = 'enterprise-audit.recorded',
  SECURITY_ALERT_RAISED = 'enterprise-audit.security_alert_raised',
  COMPLIANCE_ALERT_RAISED = 'enterprise-audit.compliance_alert_raised',
}

export interface IEnterpriseAuditEventPayload {
  event: EnterpriseAuditEvent;
  organizationId: string;
  workspaceId?: string | null;
  incidentId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
