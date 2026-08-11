import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class FileNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `File '${id}' not found`,
      errorCode: ErrorCode.FILE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class FileAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have access to this file',
      errorCode: ErrorCode.FILE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class FileTypeNotAllowedException extends AtlasException {
  constructor(mimeType: string) {
    super({
      message: `File type '${mimeType}' is not allowed`,
      errorCode: ErrorCode.FILE_TYPE_NOT_ALLOWED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FileTooLargeException extends AtlasException {
  constructor(maxSizeBytes: number) {
    super({
      message: `File exceeds the maximum allowed size of ${maxSizeBytes} bytes`,
      errorCode: ErrorCode.FILE_TOO_LARGE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FileIntegrityMismatchException extends AtlasException {
  constructor() {
    super({
      message: 'File content checksum does not match the provided checksum',
      errorCode: ErrorCode.FILE_INTEGRITY_MISMATCH,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FileQuotaExceededException extends AtlasException {
  constructor() {
    super({
      message: 'Workspace storage quota exceeded',
      errorCode: ErrorCode.FILE_QUOTA_EXCEEDED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FileFolderNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Folder '${id}' not found`,
      errorCode: ErrorCode.FILE_FOLDER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class FileAccessTokenInvalidException extends AtlasException {
  constructor() {
    super({
      message: 'Access token is invalid, expired or exhausted',
      errorCode: ErrorCode.FILE_ACCESS_TOKEN_INVALID,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class FileInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition file from '${from}' to '${to}'`,
      errorCode: ErrorCode.FILE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
