import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class ComplianceRuleNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Compliance requirement rule '${id}' not found`,
      errorCode: ErrorCode.COMPLIANCE_RULE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ComplianceRuleAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `An active compliance rule with key '${key}' already exists for this scope`,
      errorCode: ErrorCode.COMPLIANCE_RULE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ComplianceRuleInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition compliance rule from '${from}' to '${to}'`,
      errorCode: ErrorCode.COMPLIANCE_RULE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ComplianceRecordNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Compliance record '${id}' not found`,
      errorCode: ErrorCode.COMPLIANCE_RECORD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ComplianceRecordInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition compliance record from '${from}' to '${to}'`,
      errorCode: ErrorCode.COMPLIANCE_RECORD_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ComplianceAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this compliance action',
      errorCode: ErrorCode.COMPLIANCE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
