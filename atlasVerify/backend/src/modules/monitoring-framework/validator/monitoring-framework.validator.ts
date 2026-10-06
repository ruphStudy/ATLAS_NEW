import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { TenantIsolationService } from '@modules/tenant-isolation/tenant-isolation.service';
import { evaluateCondition } from '@modules/business-rules-engine/condition-evaluator.util';
import { RuleConditionOperator } from '@modules/business-rules-engine/interfaces';
import { IMonitoringAlertRule, IMonitoringSignal, IMonitoringValidationResult } from '../interfaces';
import { MonitoringSourceRegistry } from '../registry/monitoring-source.registry';
import { MONITORING_FRAMEWORK_MODULE } from '../constants';
import { MonitoringAccessDeniedException, MonitoringTenantIsolationViolationException } from '../exceptions/monitoring-framework.exceptions';

/**
 * MonitoringFrameworkValidator
 *
 * Permission enforcement via the existing `PermissionResolverService`,
 * tenant-isolation boundary checks via the existing
 * `TenantIsolationService`, alert-rule structural validation, and
 * condition evaluation reused directly from Business Rules Engine's
 * `evaluateCondition` utility — no permission model, tenant boundary or
 * condition DSL is re-implemented here.
 */
@Injectable()
export class MonitoringFrameworkValidator {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly sourceRegistry: MonitoringSourceRegistry,
  ) {}

  validateAlertRule(sourceKey: string, conditionField: string, conditionOperator: string): IMonitoringValidationResult {
    const issues: IMonitoringValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (!this.sourceRegistry.isRegistered(sourceKey)) {
      warnings.push(`Monitoring source '${sourceKey}' is not registered yet — this alert rule can stay PAUSED until it is`);
    }
    if (!Object.values(RuleConditionOperator).includes(conditionOperator as RuleConditionOperator)) {
      issues.push({ field: 'conditionOperator', message: `Unknown condition operator '${conditionOperator}'` });
    }
    if (!conditionField) {
      issues.push({ field: 'conditionField', message: 'conditionField is required' });
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /** Evaluates an alert rule's condition against one normalized signal, reusing Business Rules Engine's generic condition evaluator. */
  evaluateAlertRule(rule: IMonitoringAlertRule, signal: IMonitoringSignal): boolean {
    return evaluateCondition(
      { field: rule.conditionField, operator: rule.conditionOperator as RuleConditionOperator, value: rule.conditionValue },
      signal as unknown as Record<string, unknown>,
    );
  }

  async assertPermission(userId: string, workspaceId: string, legacyRole: string, resource: string, action: PermissionAction): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: MONITORING_FRAMEWORK_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new MonitoringAccessDeniedException(`${action} ${resource}`);
    }
  }

  async assertTenantBoundary(workspaceId: string | undefined): Promise<void> {
    if (!workspaceId) return;
    try {
      await this.tenantIsolationService.getWorkspaceOrThrow(workspaceId);
    } catch {
      throw new MonitoringTenantIsolationViolationException(workspaceId);
    }
  }
}
