import { createHash } from 'crypto';
import { IFeatureFlagDefinition, IFeatureFlagEvaluationContext, IFeatureFlagOverride, IFeatureFlagTargetingRules, FeatureFlagType } from './interfaces';

export interface IRawEvaluation {
  enabled: boolean;
  reason?: string;
}

/** Stable, deterministic 0-99 bucket for a given (flagKey, subjectId) pair — the same pair always lands in the same bucket, so percentage rollouts are sticky across evaluations. */
export function stableBucket(flagKey: string, subjectId: string): number {
  const digest = createHash('sha1').update(`${flagKey}:${subjectId}`).digest();
  return digest.readUInt32BE(0) % 100;
}

function resolveSubjectId(context: IFeatureFlagEvaluationContext): string {
  return context.userId ?? context.workspaceId ?? context.organizationId ?? 'anonymous';
}

function isWithinScheduleWindow(startDate: Date | null, endDate: Date | null): boolean {
  const now = Date.now();
  if (startDate && startDate.getTime() > now) return false;
  if (endDate && endDate.getTime() <= now) return false;
  return true;
}

function matchesRules(rules: IFeatureFlagTargetingRules | null | undefined, context: IFeatureFlagEvaluationContext, planKey: string | null, planTierRank: number | null): boolean {
  if (!rules) return true;

  if (rules.planKeys && rules.planKeys.length > 0 && (!planKey || !rules.planKeys.includes(planKey))) return false;
  if (typeof rules.minTierRank === 'number' && (planTierRank === null || planTierRank < rules.minTierRank)) return false;
  if (rules.roles && rules.roles.length > 0 && (!context.userRole || !rules.roles.includes(context.userRole))) return false;
  if (rules.countries && rules.countries.length > 0 && (!context.country || !rules.countries.includes(context.country))) return false;
  if (rules.regions && rules.regions.length > 0 && (!context.region || !rules.regions.includes(context.region))) return false;
  if (rules.marketplaces && rules.marketplaces.length > 0 && (!context.marketplace || !rules.marketplaces.includes(context.marketplace))) return false;
  if (rules.providers && rules.providers.length > 0 && (!context.provider || !rules.providers.includes(context.provider))) return false;
  if (rules.environments && rules.environments.length > 0 && (!context.environment || !rules.environments.includes(context.environment))) return false;

  return true;
}

/**
 * Pure per-type evaluation given the winning override (or `null` if none matched, in which case the
 * definition's own default/schedule apply) — no I/O, no caching, no dependency/mutual-exclusion
 * resolution (the service layer orchestrates those around this). Kept centralized here per the task's
 * "keep feature evaluation centralized and configuration-driven" rule.
 */
export function evaluateRawFlag(
  definition: IFeatureFlagDefinition,
  override: IFeatureFlagOverride | null,
  context: IFeatureFlagEvaluationContext,
  planKey: string | null,
  planTierRank: number | null,
): IRawEvaluation {
  const scheduleStart = override?.startDate ?? definition.startDate;
  const scheduleEnd = override?.endDate ?? definition.endDate;
  if (!isWithinScheduleWindow(scheduleStart, scheduleEnd)) {
    return { enabled: false, reason: 'Outside of scheduled availability window' };
  }

  const baseEnabled = override ? override.enabled : definition.defaultEnabled;
  const rolloutPercentage = override?.rolloutPercentage ?? definition.rolloutPercentage ?? 0;
  const rules = override?.rules ?? null;
  const subjectId = resolveSubjectId(context);

  switch (definition.type) {
    case FeatureFlagType.BOOLEAN:
      return { enabled: baseEnabled };

    case FeatureFlagType.PERCENTAGE: {
      if (!baseEnabled) return { enabled: false };
      const bucket = stableBucket(definition.key, subjectId);
      const enabled = bucket < rolloutPercentage;
      return { enabled, reason: enabled ? undefined : `Bucket ${bucket} outside rollout of ${rolloutPercentage}%` };
    }

    case FeatureFlagType.ALLOWLIST: {
      const enabled = baseEnabled && !!rules?.allowlist?.includes(subjectId);
      return { enabled, reason: enabled ? undefined : 'Subject is not on the allowlist' };
    }

    case FeatureFlagType.DENYLIST: {
      const denied = !!rules?.denylist?.includes(subjectId);
      return { enabled: baseEnabled && !denied, reason: denied ? 'Subject is on the denylist' : undefined };
    }

    case FeatureFlagType.RULE_BASED: {
      if (!baseEnabled) return { enabled: false };
      const matched = matchesRules(rules, context, planKey, planTierRank);
      return { enabled: matched, reason: matched ? undefined : 'No targeting rule matched this context' };
    }

    default:
      return { enabled: false, reason: 'Unknown flag type' };
  }
}
