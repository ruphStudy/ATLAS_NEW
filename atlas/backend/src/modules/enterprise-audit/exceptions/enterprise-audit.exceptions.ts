import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class EnterpriseAuditAccessDeniedException extends AtlasException {
  constructor(context: string) {
    super({
      message: `You do not have permission to ${context} in this organization's enterprise audit`,
      errorCode: ErrorCode.ENTERPRISE_AUDIT_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class EnterpriseAuditOrganizationBoundaryViolationException extends AtlasException {
  constructor(organizationId: string) {
    super({
      message: `Your workspace does not belong to organization '${organizationId}'`,
      errorCode: ErrorCode.ENTERPRISE_AUDIT_ORGANIZATION_BOUNDARY_VIOLATION,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class EnterpriseAuditIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Security incident '${id}' not found`,
      errorCode: ErrorCode.ENTERPRISE_AUDIT_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class EnterpriseAuditIncidentOutOfScopeException extends AtlasException {
  constructor(id: string, organizationId: string) {
    super({
      message: `Security incident '${id}' does not belong to organization '${organizationId}'`,
      errorCode: ErrorCode.ENTERPRISE_AUDIT_INCIDENT_OUT_OF_SCOPE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
