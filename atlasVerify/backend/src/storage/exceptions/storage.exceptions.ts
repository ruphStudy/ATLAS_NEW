import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class StorageObjectNotFoundException extends AtlasException {
  constructor() {
    super({
      message: 'Stored file content could not be located',
      errorCode: ErrorCode.STORAGE_OBJECT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class StorageWriteFailedException extends AtlasException {
  constructor(message: string) {
    super({
      message: `Failed to write file to storage: ${message}`,
      errorCode: ErrorCode.STORAGE_WRITE_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class StorageReadFailedException extends AtlasException {
  constructor(message: string) {
    super({
      message: `Failed to read file from storage: ${message}`,
      errorCode: ErrorCode.STORAGE_READ_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class StorageInvalidReferenceException extends AtlasException {
  constructor() {
    super({
      message: 'Invalid storage reference',
      errorCode: ErrorCode.STORAGE_INVALID_REFERENCE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
