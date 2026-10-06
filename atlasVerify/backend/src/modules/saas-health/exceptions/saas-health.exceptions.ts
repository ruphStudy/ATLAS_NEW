import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SaasHealthIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `SaaS health incident '${id}' not found`,
      errorCode: ErrorCode.SAAS_HEALTH_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasHealthMaintenanceWindowNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Maintenance window '${id}' not found`,
      errorCode: ErrorCode.SAAS_HEALTH_MAINTENANCE_WINDOW_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasHealthInvalidMaintenanceWindowException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.SAAS_HEALTH_INVALID_MAINTENANCE_WINDOW,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
