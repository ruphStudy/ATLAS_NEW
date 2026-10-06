import { Injectable, Logger } from '@nestjs/common';
import {
  GuardrailCheckType,
  IAiGuardrailRule,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailCheckOutcome,
} from '../interfaces';
import { DEFAULT_PATTERN_LIBRARY } from '../constants';

interface IPatternMatchConfig {
  patterns?: string[];
  flags?: string;
}

/**
 * Regex-based content check. Backs prompt-injection, credential/PII/financial
 * data leakage and generic policy-violation rules — the category and patterns
 * come entirely from the rule's own config, never hardcoded per-category logic.
 */
@Injectable()
export class PatternMatchCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.PATTERN_MATCH;
  private readonly logger = new Logger(PatternMatchCheck.name);

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const content = context.content;
    if (!content) {
      return { matched: false, reason: 'No content to inspect' };
    }

    const config = (rule.config ?? {}) as IPatternMatchConfig;
    const patterns =
      config.patterns && config.patterns.length > 0
        ? config.patterns
        : DEFAULT_PATTERN_LIBRARY[rule.category] ?? [];

    if (patterns.length === 0) {
      return { matched: false, reason: 'No patterns configured for rule' };
    }

    let matchCount = 0;
    let redactedContent = content;

    for (const source of patterns) {
      let regex: RegExp;
      try {
        regex = new RegExp(source, config.flags ?? 'gi');
      } catch {
        this.logger.warn(`Invalid guardrail pattern skipped: ${source}`);
        continue;
      }

      const matches = redactedContent.match(regex);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        redactedContent = redactedContent.replace(
          regex,
          `[REDACTED:${rule.category}]`,
        );
      }
    }

    if (matchCount === 0) {
      return { matched: false, reason: 'No pattern matches' };
    }

    return {
      matched: true,
      reason: `${rule.category} pattern matched ${matchCount} time(s)`,
      matchCount,
      redactedContent,
    };
  }
}
