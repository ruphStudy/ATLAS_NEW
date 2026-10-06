import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class GlobalSavedSearchNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Saved search '${id}' not found`,
      errorCode: ErrorCode.GLOBAL_SAVED_SEARCH_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class GlobalSearchAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action',
      errorCode: ErrorCode.GLOBAL_SEARCH_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
