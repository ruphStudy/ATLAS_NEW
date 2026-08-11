import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SaasAuditIncidentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Security incident '${id}' not found`,
      errorCode: ErrorCode.SAAS_AUDIT_INCIDENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasAuditInvalidIncidentTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition security incident from '${from}' to '${to}'`,
      errorCode: ErrorCode.SAAS_AUDIT_INVALID_INCIDENT_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SaasAuditArchiveNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Audit archive '${id}' not found`,
      errorCode: ErrorCode.SAAS_AUDIT_ARCHIVE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SaasAuditArchiveNotReadyException extends AtlasException {
  constructor(id: string, status: string) {
    super({
      message: `Audit archive '${id}' is not ready to download (status '${status}')`,
      errorCode: ErrorCode.SAAS_AUDIT_ARCHIVE_NOT_READY,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SaasAuditArchiveFailedException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Audit archive failed: ${reason}`,
      errorCode: ErrorCode.SAAS_AUDIT_ARCHIVE_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class SaasAuditInvalidDateRangeException extends AtlasException {
  constructor() {
    super({
      message: '`toDate` must be after `fromDate`',
      errorCode: ErrorCode.SAAS_AUDIT_INVALID_DATE_RANGE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
