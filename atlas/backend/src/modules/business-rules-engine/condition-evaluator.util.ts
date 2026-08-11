import { IRuleCondition, IRuleConditionGroup, RuleConditionOperator, RuleLogicOperator } from './interfaces';

/** Reads a dot-path (e.g. "order.total") off a plain object, returning `undefined` for any missing segment. */
export function readField(input: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((value, segment) => {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, input);
}

function evaluateOperator(operator: RuleConditionOperator, actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case RuleConditionOperator.EQUALS:
      return actual === expected;
    case RuleConditionOperator.NOT_EQUALS:
      return actual !== expected;
    case RuleConditionOperator.GREATER_THAN:
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case RuleConditionOperator.GREATER_THAN_OR_EQUAL:
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case RuleConditionOperator.LESS_THAN:
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case RuleConditionOperator.LESS_THAN_OR_EQUAL:
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case RuleConditionOperator.CONTAINS:
      if (Array.isArray(actual)) return actual.includes(expected);
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
    case RuleConditionOperator.NOT_CONTAINS:
      if (Array.isArray(actual)) return !actual.includes(expected);
      return typeof actual === 'string' && typeof expected === 'string' && !actual.includes(expected);
    case RuleConditionOperator.STARTS_WITH:
      return typeof actual === 'string' && typeof expected === 'string' && actual.startsWith(expected);
    case RuleConditionOperator.ENDS_WITH:
      return typeof actual === 'string' && typeof expected === 'string' && actual.endsWith(expected);
    case RuleConditionOperator.IN:
      return Array.isArray(expected) && expected.includes(actual);
    case RuleConditionOperator.NOT_IN:
      return Array.isArray(expected) && !expected.includes(actual);
    case RuleConditionOperator.BETWEEN: {
      if (!Array.isArray(expected) || expected.length !== 2 || typeof actual !== 'number') return false;
      const [min, max] = expected as [number, number];
      return actual >= min && actual <= max;
    }
    case RuleConditionOperator.EXISTS:
      return actual !== undefined && actual !== null;
    case RuleConditionOperator.NOT_EXISTS:
      return actual === undefined || actual === null;
    default:
      return false;
  }
}

export function evaluateCondition(condition: IRuleCondition, input: Record<string, unknown>): boolean {
  const actual = readField(input, condition.field);
  return evaluateOperator(condition.operator, actual, condition.value);
}

/** Recursively evaluates a nested condition group (AND/OR + leaf conditions + nested groups) against the evaluation input. */
export function evaluateConditionGroup(group: IRuleConditionGroup, input: Record<string, unknown>): boolean {
  const conditionResults = (group.conditions ?? []).map((c) => evaluateCondition(c, input));
  const groupResults = (group.groups ?? []).map((g) => evaluateConditionGroup(g, input));
  const results = [...conditionResults, ...groupResults];

  if (results.length === 0) {
    return true;
  }

  return group.logic === RuleLogicOperator.OR ? results.some(Boolean) : results.every(Boolean);
}
