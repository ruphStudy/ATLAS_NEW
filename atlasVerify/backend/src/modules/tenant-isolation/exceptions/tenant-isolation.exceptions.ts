import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class MissingTenantContextException extends AtlasException {
  constructor() {
    super({
      message: 'No tenant context could be resolved for this request',
      errorCode: ErrorCode.TENANT_CONTEXT_MISSING,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class InvalidTenantContextException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid tenant context: ${reason}`,
      errorCode: ErrorCode.TENANT_CONTEXT_INVALID,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TenantInactiveException extends AtlasException {
  constructor() {
    super({
      message: 'This workspace is not active',
      errorCode: ErrorCode.TENANT_INACTIVE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class TenantAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have access to this tenant resource',
      errorCode: ErrorCode.TENANT_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class TenantIdTamperingDetectedException extends AtlasException {
  constructor() {
    super({
      message: 'The tenant identifier supplied in the request does not match your authenticated tenant context',
      errorCode: ErrorCode.TENANT_ID_TAMPERING_DETECTED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class PlatformAdminRequiredException extends AtlasException {
  constructor() {
    super({
      message: 'This operation requires platform-admin authorization',
      errorCode: ErrorCode.PLATFORM_ADMIN_REQUIRED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
