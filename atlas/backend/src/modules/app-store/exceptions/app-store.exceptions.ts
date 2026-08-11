import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class AppListingNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `App listing '${key}' not found`,
      errorCode: ErrorCode.APP_LISTING_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AppListingAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `An app listing with key '${key}' already exists`,
      errorCode: ErrorCode.APP_LISTING_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AppListingInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.APP_LISTING_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AppListingInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition app listing from '${from}' to '${to}'`,
      errorCode: ErrorCode.APP_LISTING_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AppVersionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `App version '${id}' not found`,
      errorCode: ErrorCode.APP_VERSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AppVersionAlreadyExistsException extends AtlasException {
  constructor(versionString: string) {
    super({
      message: `Version '${versionString}' already exists for this app`,
      errorCode: ErrorCode.APP_VERSION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AppDependencyNotSatisfiedException extends AtlasException {
  constructor(dependencyKey: string) {
    super({
      message: `Required dependency '${dependencyKey}' is not installed and active for this tenant`,
      errorCode: ErrorCode.APP_DEPENDENCY_NOT_SATISFIED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AppIncompatibleVersionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.APP_INCOMPATIBLE_VERSION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AppAlreadyInstalledException extends AtlasException {
  constructor(appKey: string) {
    super({
      message: `App '${appKey}' is already installed for this tenant`,
      errorCode: ErrorCode.APP_ALREADY_INSTALLED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AppInstallationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `App installation '${id}' not found`,
      errorCode: ErrorCode.APP_INSTALLATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AppNotEligibleException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.APP_NOT_ELIGIBLE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class AppDependentInstallationExistsException extends AtlasException {
  constructor(dependentKey: string) {
    super({
      message: `Cannot uninstall — '${dependentKey}' is still installed and depends on this app`,
      errorCode: ErrorCode.APP_DEPENDENT_INSTALLATION_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AppAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this app store operation',
      errorCode: ErrorCode.APP_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
