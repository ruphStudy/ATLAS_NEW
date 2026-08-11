import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SaasMonitoringModuleNotMonitoredException extends AtlasException {
  constructor(module: string) {
    super({
      message: `'${module}' is not a monitored saas-monitoring module`,
      errorCode: ErrorCode.SAAS_MONITORING_MODULE_NOT_MONITORED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SaasMonitoringIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `SaaS health incident '${id}' not found`,
      errorCode: ErrorCode.SAAS_MONITORING_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
