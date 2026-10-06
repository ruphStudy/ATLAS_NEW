import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class AiGuardrailRuleNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Guardrail rule '${id}' not found`,
      errorCode: ErrorCode.AI_GUARDRAIL_RULE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiGuardrailRuleDuplicateException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Guardrail rule with name '${name}' already exists for this scope`,
      errorCode: ErrorCode.AI_GUARDRAIL_RULE_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiGuardrailOverrideNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Guardrail override '${id}' not found`,
      errorCode: ErrorCode.AI_GUARDRAIL_OVERRIDE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiGuardrailIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Guardrail incident '${id}' not found`,
      errorCode: ErrorCode.AI_GUARDRAIL_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiGuardrailIncidentInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition guardrail incident from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_GUARDRAIL_INCIDENT_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiGuardrailApprovalNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Guardrail approval '${id}' not found`,
      errorCode: ErrorCode.AI_GUARDRAIL_APPROVAL_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiGuardrailApprovalAlreadyDecidedException extends AtlasException {
  constructor(id: string, status: string) {
    super({
      message: `Guardrail approval '${id}' has already been decided (status: ${status})`,
      errorCode: ErrorCode.AI_GUARDRAIL_APPROVAL_ALREADY_DECIDED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiGuardrailEvaluationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Guardrail evaluation '${id}' not found`,
      errorCode: ErrorCode.AI_GUARDRAIL_EVALUATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

/**
 * Thrown by callers (e.g. the AI orchestrator) that choose to hard-fail
 * when a guardrail evaluation resolves to BLOCK or REQUIRE_REVIEW.
 */
export class AiGuardrailActionBlockedException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Action blocked by AI guardrails: ${reason}`,
      errorCode: ErrorCode.AI_GUARDRAIL_ACTION_BLOCKED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
