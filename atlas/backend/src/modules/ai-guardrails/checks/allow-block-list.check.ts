import { Injectable } from '@nestjs/common';
import {
  GuardrailCheckType,
  IAiGuardrailRule,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailCheckOutcome,
} from '../interfaces';

interface IAllowlistConfig {
  allowedValues?: string[];
}

interface IBlocklistConfig {
  blockedTerms?: string[];
}

function subjectFor(context: IGuardrailCheckContext): string | undefined {
  return context.toolName ?? context.actionName ?? context.content;
}

/**
 * Violation when the subject (tool name, action name, or free-text content)
 * is NOT one of the configured allowed values.
 */
@Injectable()
export class AllowlistCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.ALLOWLIST;

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const config = (rule.config ?? {}) as IAllowlistConfig;
    const allowed = config.allowedValues ?? [];
    const subject = subjectFor(context);

    if (allowed.length === 0 || !subject) {
      return { matched: false, reason: 'No allowlist configured or no subject to check' };
    }

    const normalizedAllowed = allowed.map((v) => v.toLowerCase());

    if (context.toolName || context.actionName) {
      const isAllowed = normalizedAllowed.includes(subject.toLowerCase());
      return isAllowed
        ? { matched: false, reason: 'Subject is on the allowlist' }
        : { matched: true, reason: `'${subject}' is not on the configured allowlist` };
    }

    const containsAllowedTerm = normalizedAllowed.some((term) =>
      subject.toLowerCase().includes(term),
    );

    return containsAllowedTerm
      ? { matched: false, reason: 'Content contains an allowlisted term' }
      : { matched: true, reason: 'Content does not contain any allowlisted term' };
  }
}

/**
 * Violation when the subject (tool name, action name, or free-text content)
 * matches one of the configured blocked terms.
 */
@Injectable()
export class BlocklistCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.BLOCKLIST;

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const config = (rule.config ?? {}) as IBlocklistConfig;
    const blocked = config.blockedTerms ?? [];
    const subject = subjectFor(context);

    if (blocked.length === 0 || !subject) {
      return { matched: false, reason: 'No blocklist configured or no subject to check' };
    }

    const lowerSubject = subject.toLowerCase();
    const matchedTerms = blocked.filter((term) =>
      lowerSubject.includes(term.toLowerCase()),
    );

    if (matchedTerms.length === 0) {
      return { matched: false, reason: 'No blocklisted term found' };
    }

    return {
      matched: true,
      reason: `Blocklisted term(s) matched: ${matchedTerms.length}`,
      matchCount: matchedTerms.length,
    };
  }
}
