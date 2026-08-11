import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class PushDeviceTokenNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Push device token '${id}' not found`,
      errorCode: ErrorCode.PUSH_DEVICE_TOKEN_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PushDeviceTokenInvalidException extends AtlasException {
  constructor(token: string) {
    super({
      message: `Push device token is invalid or has been unregistered`,
      errorCode: ErrorCode.PUSH_DEVICE_TOKEN_INVALID,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
    void token; // never included in the message — device tokens are not logged/exposed
  }
}

export class PushDeviceTokenNoTargetsResolvedException extends AtlasException {
  constructor(targetType: string, targetValue: string) {
    super({
      message: `No active device tokens resolved for ${targetType} target '${targetValue}'`,
      errorCode: ErrorCode.PUSH_DEVICE_TOKEN_NO_TARGETS_RESOLVED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
