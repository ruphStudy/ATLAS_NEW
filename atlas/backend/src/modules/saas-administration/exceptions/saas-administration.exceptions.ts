import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SaasAdminTenantNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Tenant workspace '${id}' not found`,
      errorCode: ErrorCode.SAAS_ADMIN_TENANT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasAdminInvalidActionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.SAAS_ADMIN_INVALID_ACTION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SaasAdminNoApplicableQuotaPolicyException extends AtlasException {
  constructor(resourceKey: string) {
    super({
      message: `No quota policy exists for resource '${resourceKey}' on this tenant — create one via Quota Management before granting an override`,
      errorCode: ErrorCode.SAAS_ADMIN_NO_APPLICABLE_QUOTA_POLICY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SaasAdminImpersonationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Impersonation session '${id}' not found`,
      errorCode: ErrorCode.SAAS_ADMIN_IMPERSONATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasAdminImpersonationAlreadyActiveException extends AtlasException {
  constructor() {
    super({
      message: 'An active impersonation session already exists for this admin and target user',
      errorCode: ErrorCode.SAAS_ADMIN_IMPERSONATION_ALREADY_ACTIVE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SaasAdminAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform platform-admin operations',
      errorCode: ErrorCode.SAAS_ADMIN_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
