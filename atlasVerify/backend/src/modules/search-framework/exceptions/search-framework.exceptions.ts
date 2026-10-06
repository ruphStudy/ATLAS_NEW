import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SearchEntityNotRegisteredException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Searchable entity '${key}' is not registered`,
      errorCode: ErrorCode.SEARCH_ENTITY_NOT_REGISTERED,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SearchEntityAlreadyRegisteredException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Searchable entity '${key}' is already registered`,
      errorCode: ErrorCode.SEARCH_ENTITY_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SearchDocumentNotFoundException extends AtlasException {
  constructor(entityType: string, entityId: string) {
    super({
      message: `No indexed document for '${entityType}:${entityId}'`,
      errorCode: ErrorCode.SEARCH_DOCUMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SearchInvalidQueryException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid search query: ${reason}`,
      errorCode: ErrorCode.SEARCH_INVALID_QUERY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SearchAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this search-framework action',
      errorCode: ErrorCode.SEARCH_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
