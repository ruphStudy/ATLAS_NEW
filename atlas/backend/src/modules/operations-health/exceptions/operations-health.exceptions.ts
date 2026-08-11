import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class OperationsHealthModuleNotMonitoredException extends AtlasException {
  constructor(module: string) {
    super({
      message: `'${module}' is not a monitored operations-health module`,
      errorCode: ErrorCode.OPERATIONS_HEALTH_MODULE_NOT_MONITORED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OperationsHealthSnapshotNotFoundException extends AtlasException {
  constructor(module: string) {
    super({
      message: `No health snapshot found for module '${module}'`,
      errorCode: ErrorCode.OPERATIONS_HEALTH_SNAPSHOT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OperationsHealthIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Operations health incident '${id}' not found`,
      errorCode: ErrorCode.OPERATIONS_HEALTH_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OperationsHealthAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to view operations health data',
      errorCode: ErrorCode.OPERATIONS_HEALTH_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
