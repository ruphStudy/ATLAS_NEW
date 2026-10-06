import { ConflictException, ForbiddenException, HttpException, HttpStatus, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

// ── Base ──────────────────────────────────────────────────────────
export interface AtlasExceptionOptions {
  message: string;
  errorCode: ErrorCode;
  statusCode: HttpStatus;
  errors?: string[];
}

/**
 * AtlasException – base for all domain-specific exceptions.
 * Adds a machine-readable `errorCode` to the standard HTTP exception.
 */
export class AtlasException extends HttpException {
  readonly errorCode: ErrorCode;
  readonly errors: string[] | undefined;

  constructor({ message, errorCode, statusCode, errors }: AtlasExceptionOptions) {
    super({ message, errorCode, errors: errors ?? null }, statusCode);
    this.errorCode = errorCode;
    this.errors = errors;
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────
export class ResourceNotFoundException extends AtlasException {
  constructor(resource: string, identifier?: string) {
    super({
      message: identifier
        ? `${resource} '${identifier}' not found`
        : `${resource} not found`,
      errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

// ── 409 Conflict ──────────────────────────────────────────────────
export class DuplicateResourceException extends AtlasException {
  constructor(resource: string, field: string, value?: string) {
    super({
      message: value
        ? `${resource} with ${field} '${value}' already exists`
        : `${resource} with this ${field} already exists`,
      errorCode: ErrorCode.DUPLICATE_RESOURCE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────
export class InsufficientPermissionsException extends AtlasException {
  constructor(message = 'Insufficient permissions for this operation') {
    super({
      message,
      errorCode: ErrorCode.INSUFFICIENT_PERMISSIONS,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class WorkspaceAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have access to this workspace',
      errorCode: ErrorCode.WORKSPACE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

// ── 422 Business Rule Violation ───────────────────────────────────
export class BusinessRuleException extends AtlasException {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION,
  ) {
    super({
      message,
      errorCode,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

// ── Helper: map HTTP status → generic ErrorCode ───────────────────
export function statusToErrorCode(status: number): ErrorCode {
  const map: Record<number, ErrorCode> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.RESOURCE_NOT_FOUND,
    409: ErrorCode.DUPLICATE_RESOURCE,
    422: ErrorCode.VALIDATION_FAILED,
    429: ErrorCode.RATE_LIMIT_EXCEEDED,
  };
  return map[status] ?? ErrorCode.INTERNAL_ERROR;
}
