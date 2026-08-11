import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class BillingPeriodNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Billing period '${id}' not found`,
      errorCode: ErrorCode.BILLING_PERIOD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class BillingPeriodInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition billing period from '${from}' to '${to}'`,
      errorCode: ErrorCode.BILLING_PERIOD_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class BillingPeriodImmutableException extends AtlasException {
  constructor(status: string) {
    super({
      message: `Billing period is '${status}' and can no longer be modified`,
      errorCode: ErrorCode.BILLING_PERIOD_IMMUTABLE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class BillingInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid billing input: ${reason}`,
      errorCode: ErrorCode.BILLING_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class BillingAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage billing for this workspace',
      errorCode: ErrorCode.BILLING_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class BillingRuleNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Billing rule '${id}' not found`,
      errorCode: ErrorCode.BILLING_RULE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class BillingPaymentExceedsBalanceException extends AtlasException {
  constructor() {
    super({
      message: 'Payment amount exceeds the outstanding balance due',
      errorCode: ErrorCode.BILLING_PAYMENT_EXCEEDS_BALANCE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
