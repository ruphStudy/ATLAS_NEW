import { GuardrailViolationCategory } from '../interfaces';

/**
 * Built-in regex fallbacks used by PatternMatchCheck when a rule's own
 * `config.patterns` is empty. Rules remain configuration-driven — these are
 * only a sane out-of-the-box default per category, not a hardcoded policy.
 */
export const DEFAULT_PATTERN_LIBRARY: Partial<Record<GuardrailViolationCategory, string[]>> = {
  [GuardrailViolationCategory.PROMPT_INJECTION]: [
    'ignore (all )?(previous|prior|above) instructions',
    'disregard (all )?(previous|prior|above) (instructions|prompts)',
    'you are now (in )?(dan|developer|jailbreak) mode',
    'act as (if )?(you have no|there are no) restrictions',
    'reveal (your|the) system prompt',
    'override (your|the) (safety|guardrail) (settings|instructions)',
  ],
  [GuardrailViolationCategory.CREDENTIAL_EXPOSURE]: [
    'AKIA[0-9A-Z]{16}',
    'sk-[a-zA-Z0-9]{20,}',
    '-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----',
    '(api|access)[_-]?key["\\s:=]+[a-zA-Z0-9/+_-]{16,}',
    'password["\\s:=]+\\S{6,}',
  ],
  [GuardrailViolationCategory.PII_EXPOSURE]: [
    '\\b[\\w.+-]+@[\\w-]+\\.[\\w.-]+\\b',
    '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    '\\b(?:\\+?\\d{1,3}[- ]?)?\\(?\\d{3}\\)?[- ]?\\d{3}[- ]?\\d{4}\\b',
  ],
  [GuardrailViolationCategory.FINANCIAL_DATA_EXPOSURE]: [
    '\\b(?:\\d[ -]*?){13,16}\\b',
    '\\b[A-Z]{2}\\d{2}[A-Z0-9]{10,30}\\b',
  ],
};

export const DEFAULT_RISK_WEIGHT = 1.0;

export const GUARDRAIL_RISK_SCORE_MAX = 100;
