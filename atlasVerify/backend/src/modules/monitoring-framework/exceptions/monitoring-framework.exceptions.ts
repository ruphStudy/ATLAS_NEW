import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class MonitoringSloNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Monitoring SLO '${id}' not found`,
      errorCode: ErrorCode.MONITORING_SLO_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class MonitoringSloAlreadyExistsException extends AtlasException {
  constructor(service: string, dimension: string) {
    super({
      message: `A monitoring SLO already exists for service '${service}' / dimension '${dimension}' in this scope`,
      errorCode: ErrorCode.MONITORING_SLO_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class MonitoringSloInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition monitoring SLO from '${from}' to '${to}'`,
      errorCode: ErrorCode.MONITORING_SLO_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class MonitoringAlertRuleNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Monitoring alert rule '${id}' not found`,
      errorCode: ErrorCode.MONITORING_ALERT_RULE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class MonitoringAlertRuleInvalidDefinitionException extends AtlasException {
  constructor(errors: string[]) {
    super({
      message: 'Monitoring alert rule validation failed',
      errorCode: ErrorCode.MONITORING_ALERT_RULE_INVALID_DEFINITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    });
  }
}

export class MonitoringIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Monitoring incident '${id}' not found`,
      errorCode: ErrorCode.MONITORING_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class MonitoringIncidentInvalidStateTransitionException extends AtlasException {
  constructor(from: string, action: string) {
    super({
      message: `Cannot perform '${action}' on a monitoring incident in status '${from}'`,
      errorCode: ErrorCode.MONITORING_INCIDENT_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class MonitoringSourceNotRegisteredException extends AtlasException {
  constructor(sourceKey: string) {
    super({
      message: `Monitoring source '${sourceKey}' is not registered`,
      errorCode: ErrorCode.MONITORING_SOURCE_NOT_REGISTERED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class MonitoringTenantIsolationViolationException extends AtlasException {
  constructor(workspaceId: string) {
    super({
      message: `Requested monitoring data for workspace '${workspaceId}' is outside the authorized tenant boundary for this caller`,
      errorCode: ErrorCode.MONITORING_TENANT_ISOLATION_VIOLATION,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class MonitoringAccessDeniedException extends AtlasException {
  constructor(action: string) {
    super({
      message: `You do not have permission to ${action}`,
      errorCode: ErrorCode.MONITORING_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
