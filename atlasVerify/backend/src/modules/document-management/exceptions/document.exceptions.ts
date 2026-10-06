import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class DocumentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Document '${id}' not found`,
      errorCode: ErrorCode.DOCUMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class DocumentAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this document',
      errorCode: ErrorCode.DOCUMENT_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class DocumentInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition document from '${from}' to '${to}'`,
      errorCode: ErrorCode.DOCUMENT_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class DocumentLinkAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'This document is already linked to that entity',
      errorCode: ErrorCode.DOCUMENT_LINK_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class DocumentLinkNotFoundException extends AtlasException {
  constructor() {
    super({
      message: 'Document entity link not found',
      errorCode: ErrorCode.DOCUMENT_LINK_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
