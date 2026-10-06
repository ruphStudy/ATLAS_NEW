import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class AuditLogEntryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Audit log entry '${id}' not found`,
      errorCode: ErrorCode.AUDIT_LOG_ENTRY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AuditLogAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'Your role does not have permission to view audit logs',
      errorCode: ErrorCode.AUDIT_LOG_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class AuditLogExportDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'Your role does not have permission to export audit logs',
      errorCode: ErrorCode.AUDIT_LOG_EXPORT_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
