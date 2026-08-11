import {
  IRule,
  IRuleAction,
  IRuleCondition,
  IRuleConditionGroup,
  IRuleValidationIssue,
  RuleActionType,
  RuleConditionOperator,
  RuleLogicOperator,
  RuleTriggerType,
} from './interfaces';
import { MAX_CONDITION_NESTING_DEPTH } from './constants';

interface IRuleDraft {
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  conditions: IRuleConditionGroup;
  actions: IRuleAction[];
}

function validateCondition(condition: IRuleCondition, issues: IRuleValidationIssue[]): void {
  if (!condition.field) {
    issues.push({ severity: 'ERROR', code: 'CONDITION_MISSING_FIELD', message: 'A condition is missing its field path' });
  }
  if (!Object.values(RuleConditionOperator).includes(condition.operator)) {
    issues.push({
      severity: 'ERROR',
      code: 'CONDITION_INVALID_OPERATOR',
      message: `Unknown condition operator '${condition.operator}' on field '${condition.field}'`,
    });
    return;
  }
  const noValueRequired = condition.operator === RuleConditionOperator.EXISTS || condition.operator === RuleConditionOperator.NOT_EXISTS;
  if (!noValueRequired && condition.value === undefined) {
    issues.push({
      severity: 'ERROR',
      code: 'CONDITION_MISSING_VALUE',
      message: `Operator '${condition.operator}' on field '${condition.field}' requires a value`,
    });
  }
  if (condition.operator === RuleConditionOperator.BETWEEN && (!Array.isArray(condition.value) || condition.value.length !== 2)) {
    issues.push({
      severity: 'ERROR',
      code: 'CONDITION_INVALID_BETWEEN_VALUE',
      message: `Operator 'BETWEEN' on field '${condition.field}' requires a two-element array value`,
    });
  }
  if (
    (condition.operator === RuleConditionOperator.IN || condition.operator === RuleConditionOperator.NOT_IN) &&
    !Array.isArray(condition.value)
  ) {
    issues.push({
      severity: 'ERROR',
      code: 'CONDITION_INVALID_IN_VALUE',
      message: `Operator '${condition.operator}' on field '${condition.field}' requires an array value`,
    });
  }
}

function validateConditionGroup(group: IRuleConditionGroup, issues: IRuleValidationIssue[], depth: number): void {
  if (depth > MAX_CONDITION_NESTING_DEPTH) {
    issues.push({
      severity: 'ERROR',
      code: 'CONDITION_TOO_DEEPLY_NESTED',
      message: `Condition groups may not nest deeper than ${MAX_CONDITION_NESTING_DEPTH} levels`,
    });
    return;
  }
  if (!Object.values(RuleLogicOperator).includes(group.logic)) {
    issues.push({ severity: 'ERROR', code: 'GROUP_INVALID_LOGIC', message: `Unknown condition group logic '${group.logic}'` });
  }
  (group.conditions ?? []).forEach((c) => validateCondition(c, issues));
  (group.groups ?? []).forEach((g) => validateConditionGroup(g, issues, depth + 1));
}

function validateAction(action: IRuleAction, issues: IRuleValidationIssue[]): void {
  if (!action.type) {
    issues.push({ severity: 'ERROR', code: 'ACTION_MISSING_TYPE', message: 'An action is missing its type' });
    return;
  }
  if (!action.config || typeof action.config !== 'object') {
    issues.push({ severity: 'ERROR', code: 'ACTION_MISSING_CONFIG', message: `Action '${action.type}' is missing its config object` });
    return;
  }
  switch (action.type) {
    case RuleActionType.NOTIFY:
      if (!action.config.title || !action.config.message) {
        issues.push({ severity: 'ERROR', code: 'ACTION_NOTIFY_INVALID_CONFIG', message: 'NOTIFY action requires config.title and config.message' });
      }
      break;
    case RuleActionType.CREATE_TASK:
      if (!action.config.title) {
        issues.push({ severity: 'ERROR', code: 'ACTION_CREATE_TASK_INVALID_CONFIG', message: 'CREATE_TASK action requires config.title' });
      }
      break;
    case RuleActionType.REQUIRE_APPROVAL:
      if (!action.config.definitionKey) {
        issues.push({
          severity: 'ERROR',
          code: 'ACTION_REQUIRE_APPROVAL_INVALID_CONFIG',
          message: 'REQUIRE_APPROVAL action requires config.definitionKey',
        });
      }
      break;
    case RuleActionType.EMIT_EVENT:
      if (!action.config.eventName) {
        issues.push({ severity: 'ERROR', code: 'ACTION_EMIT_EVENT_INVALID_CONFIG', message: 'EMIT_EVENT action requires config.eventName' });
      }
      break;
    case RuleActionType.BLOCK_ACTION:
    case RuleActionType.UPDATE_STATUS:
    case RuleActionType.ROUTE_WORKFLOW:
      break;
    default:
      issues.push({
        severity: 'WARNING',
        code: 'ACTION_UNKNOWN_TYPE',
        message: `Action type '${action.type}' is not one of the built-in types — a handler must be registered for it via RuleActionRegistryService`,
      });
  }
}

export function validateRuleSyntax(draft: IRuleDraft): IRuleValidationIssue[] {
  const issues: IRuleValidationIssue[] = [];

  validateConditionGroup(draft.conditions, issues, 1);

  if (!draft.actions || draft.actions.length === 0) {
    issues.push({ severity: 'ERROR', code: 'RULE_NO_ACTIONS', message: 'A rule must define at least one action' });
  } else {
    draft.actions.forEach((a) => validateAction(a, issues));
  }

  if ((draft.triggerType === RuleTriggerType.EVENT || draft.triggerType === RuleTriggerType.WORKFLOW) && !draft.triggerRef) {
    issues.push({
      severity: 'ERROR',
      code: 'RULE_MISSING_TRIGGER_REF',
      message: `triggerType '${draft.triggerType}' requires a triggerRef`,
    });
  }

  return issues;
}

/**
 * Detects circular execution chains formed via EMIT_EVENT actions: builds a
 * directed graph over event names (edge = "a rule listening for event X
 * emits event Y"), then checks whether the candidate rule's own trigger
 * event is reachable from itself. Only rules with `triggerType: EVENT` and
 * `EMIT_EVENT` actions participate — everything else is acyclic by
 * construction (API/SCHEDULE triggers have no listeners to chain into).
 */
export function detectCircularExecution(
  candidate: { id?: string; triggerType: RuleTriggerType; triggerRef?: string | null; actions: IRuleAction[] },
  allRules: Pick<IRule, 'id' | 'triggerType' | 'triggerRef' | 'actions'>[],
): IRuleValidationIssue[] {
  if (candidate.triggerType !== RuleTriggerType.EVENT || !candidate.triggerRef) {
    return [];
  }

  const graph = new Map<string, Set<string>>();
  const addEdges = (triggerType: RuleTriggerType, triggerRef: string | null | undefined, actions: IRuleAction[]) => {
    if (triggerType !== RuleTriggerType.EVENT || !triggerRef) return;
    const emitted = actions
      .filter((a) => a.type === RuleActionType.EMIT_EVENT)
      .map((a) => a.config?.eventName as string | undefined)
      .filter((v): v is string => Boolean(v));
    if (emitted.length === 0) return;
    const edges = graph.get(triggerRef) ?? new Set<string>();
    emitted.forEach((e) => edges.add(e));
    graph.set(triggerRef, edges);
  };

  for (const rule of allRules) {
    if (candidate.id && rule.id === candidate.id) continue;
    addEdges(rule.triggerType, rule.triggerRef, (rule.actions as IRuleAction[]) ?? []);
  }
  addEdges(candidate.triggerType, candidate.triggerRef, candidate.actions);

  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    if (node === candidate.triggerRef && path.length > 0) {
      return [...path, node];
    }
    if (visited.has(node)) return null;
    visited.add(node);
    path.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    path.pop();
    return null;
  }

  const cycle = dfs(candidate.triggerRef);
  if (!cycle) return [];

  return [
    {
      severity: 'ERROR',
      code: 'RULE_CIRCULAR_EXECUTION',
      message: `Circular execution chain detected: ${cycle.join(' -> ')}`,
    },
  ];
}
