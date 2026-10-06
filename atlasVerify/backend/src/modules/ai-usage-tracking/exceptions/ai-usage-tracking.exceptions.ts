import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class AiUsageRecordNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Usage record '${id}' not found`,
      errorCode: ErrorCode.AI_USAGE_RECORD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiUsageQuotaNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Usage quota '${id}' not found`,
      errorCode: ErrorCode.AI_USAGE_QUOTA_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiUsageQuotaDuplicateException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Usage quota with name '${name}' already exists for this workspace`,
      errorCode: ErrorCode.AI_USAGE_QUOTA_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}
