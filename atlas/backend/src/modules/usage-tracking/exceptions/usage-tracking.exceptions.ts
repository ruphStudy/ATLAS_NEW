import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class UsageRecordNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Usage record '${id}' not found`,
      errorCode: ErrorCode.USAGE_RECORD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class UsageRecordAlreadyReversedException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Usage record '${id}' has already been reversed`,
      errorCode: ErrorCode.USAGE_RECORD_ALREADY_REVERSED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class UsageInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid usage record: ${reason}`,
      errorCode: ErrorCode.USAGE_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class UsageAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to correct usage for this workspace',
      errorCode: ErrorCode.USAGE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
