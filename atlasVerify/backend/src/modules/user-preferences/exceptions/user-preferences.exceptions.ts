import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class UserPreferenceNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `'${key}' is not a recognized user-preference key`,
      errorCode: ErrorCode.USER_PREFERENCE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class UserPreferenceNotConfiguredException extends AtlasException {
  constructor(key: string) {
    super({
      message: `User preference '${key}' has not been set yet`,
      errorCode: ErrorCode.USER_PREFERENCE_NOT_CONFIGURED,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
