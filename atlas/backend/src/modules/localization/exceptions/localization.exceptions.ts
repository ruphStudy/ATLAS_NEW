import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class LocaleNotFoundException extends AtlasException {
  constructor(code: string) {
    super({
      message: `Locale '${code}' not found`,
      errorCode: ErrorCode.LOCALE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class LocaleAlreadyExistsException extends AtlasException {
  constructor(code: string) {
    super({
      message: `Locale '${code}' already exists`,
      errorCode: ErrorCode.LOCALE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TranslationNamespaceNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Translation namespace '${key}' not found`,
      errorCode: ErrorCode.TRANSLATION_NAMESPACE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TranslationNamespaceAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Translation namespace '${key}' already exists`,
      errorCode: ErrorCode.TRANSLATION_NAMESPACE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TranslationKeyNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Translation key '${key}' not found`,
      errorCode: ErrorCode.TRANSLATION_KEY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TranslationKeyAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Translation key '${key}' already exists in this namespace`,
      errorCode: ErrorCode.TRANSLATION_KEY_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class LocalizationAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this localization action',
      errorCode: ErrorCode.LOCALIZATION_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
