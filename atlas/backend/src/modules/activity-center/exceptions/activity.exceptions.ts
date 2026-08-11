import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class ActivityEntryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Activity entry '${id}' not found`,
      errorCode: ErrorCode.ACTIVITY_ENTRY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

/** Reserved for internal use — cross-user access is deliberately surfaced as 404 (see ActivityEntryNotFoundException), not 403, to avoid confirming another user's activity exists. */
export class ActivityEntryAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have access to this activity entry',
      errorCode: ErrorCode.ACTIVITY_ENTRY_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
