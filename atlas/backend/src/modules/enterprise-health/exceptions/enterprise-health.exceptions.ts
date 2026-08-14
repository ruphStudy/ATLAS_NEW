import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class EnterpriseHealthAccessDeniedException extends AtlasException {
  constructor(context: string) {
    super({
      message: `You do not have permission to ${context} in this organization's enterprise health`,
      errorCode: ErrorCode.ENTERPRISE_HEALTH_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class EnterpriseHealthOrganizationBoundaryViolationException extends AtlasException {
  constructor(organizationId: string) {
    super({
      message: `Your workspace does not belong to organization '${organizationId}'`,
      errorCode: ErrorCode.ENTERPRISE_HEALTH_ORGANIZATION_BOUNDARY_VIOLATION,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class EnterpriseHealthIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Enterprise health incident '${id}' not found`,
      errorCode: ErrorCode.ENTERPRISE_HEALTH_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class EnterpriseHealthIncidentInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition enterprise health incident from '${from}' to '${to}'`,
      errorCode: ErrorCode.ENTERPRISE_HEALTH_INCIDENT_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
