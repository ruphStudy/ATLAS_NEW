import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class TenantAnalyticsTenantNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Tenant workspace '${id}' not found`,
      errorCode: ErrorCode.TENANT_ANALYTICS_TENANT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TenantAnalyticsInvalidDateRangeException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.TENANT_ANALYTICS_INVALID_DATE_RANGE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TenantAnalyticsUnsupportedExportFormatException extends AtlasException {
  constructor(format: string) {
    super({
      message: `Export format '${format}' is not supported`,
      errorCode: ErrorCode.TENANT_ANALYTICS_UNSUPPORTED_EXPORT_FORMAT,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TenantAnalyticsUnknownReportException extends AtlasException {
  constructor(report: string) {
    super({
      message: `Unknown report '${report}'`,
      errorCode: ErrorCode.TENANT_ANALYTICS_UNKNOWN_REPORT,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TenantAnalyticsAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to access tenant analytics',
      errorCode: ErrorCode.TENANT_ANALYTICS_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
