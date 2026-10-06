import { RuleStatus, RuleActionType } from '../interfaces';

export const BUSINESS_RULES_ENGINE_MODULE = 'business-rules-engine';
export const SYSTEM_RULE_SCOPE_KEY = 'SYSTEM';

/** Fallback actor id for actions executed from non-interactive triggers (EVENT/SCHEDULE) where no human user initiated the evaluation. Not a real user record — these fields are plain strings, not FK-enforced. */
export const SYSTEM_ACTOR_ID = 'system';

/** Roles permitted to manage GLOBAL/organization-scoped rules. */
export const RULES_GLOBAL_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles permitted to manage workspace-scoped rules. */
export const RULES_WORKSPACE_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const RULE_ALLOWED_TRANSITIONS: Record<RuleStatus, RuleStatus[]> = {
  [RuleStatus.DRAFT]: [RuleStatus.PUBLISHED, RuleStatus.ARCHIVED],
  [RuleStatus.PUBLISHED]: [RuleStatus.DISABLED, RuleStatus.ARCHIVED],
  [RuleStatus.DISABLED]: [RuleStatus.PUBLISHED, RuleStatus.ARCHIVED],
  [RuleStatus.ARCHIVED]: [RuleStatus.DRAFT],
};

export const RULE_CACHE_TTL_MS = 5 * 60 * 1000;

export const RULE_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'name'] as const;

/**
 * Action types with a built-in handler shipped by the engine itself — thin
 * wrappers over already-generic modules (Notification Center, Task
 * Management, Approval Workflow, and the engine's own event queue).
 * `BLOCK_ACTION` is handled inline by the engine (no external call).
 * Anything else (e.g. `UPDATE_STATUS`, `ROUTE_WORKFLOW`, or a custom action
 * type) must be registered by the owning module via `RuleActionRegistryService`.
 */
export const BUILT_IN_RULE_ACTION_TYPES: string[] = [
  RuleActionType.NOTIFY,
  RuleActionType.CREATE_TASK,
  RuleActionType.REQUIRE_APPROVAL,
  RuleActionType.EMIT_EVENT,
  RuleActionType.BLOCK_ACTION,
];

export const MAX_CONDITION_NESTING_DEPTH = 8;
