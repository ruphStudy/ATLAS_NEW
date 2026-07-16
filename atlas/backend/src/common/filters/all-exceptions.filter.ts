import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AtlasException, statusToErrorCode } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

interface ErrorBody {
  success: false;
  message: string;
  errorCode: string;
  errors: string[] | null;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId: string;
}

/**
 * AllExceptionsFilter
 *
 * Catches every exception and formats it into the standard ATLAS error envelope.
 *
 * Response shape:
 * {
 *   "success": false,
 *   "message": "...",
 *   "errorCode": "RESOURCE_NOT_FOUND",
 *   "errors": [...] | null,
 *   "statusCode": 4xx | 5xx,
 *   "timestamp": "ISO-8601",
 *   "path": "/api/v1/...",
 *   "requestId": "uuid"
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errors, errorCode } = this.extractDetails(exception);

    const body: ErrorBody = {
      success: false,
      message,
      errorCode,
      errors,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId ?? 'unknown',
    };

    const logMessage = `${request.method} ${request.url} → ${statusCode}: ${message} [${body.requestId}]`;

    if (statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(logMessage);
    }

    response.status(statusCode).json(body);
  }

  private extractDetails(exception: unknown): {
    statusCode: number;
    message: string;
    errors: string[] | null;
    errorCode: string;
  } {
    // AtlasException – domain exceptions with explicit error codes
    if (exception instanceof AtlasException) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        errors: exception.errors ?? null,
        errorCode: exception.errorCode,
      };
    }

    // NestJS / Passport HttpExceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        const raw = resObj['message'];

        if (Array.isArray(raw)) {
          return {
            statusCode: status,
            message: 'Validation failed',
            errors: raw as string[],
            errorCode: ErrorCode.VALIDATION_FAILED,
          };
        }

        return {
          statusCode: status,
          message: typeof raw === 'string' ? raw : exception.message,
          errors: null,
          errorCode: statusToErrorCode(status),
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        errors: null,
        errorCode: statusToErrorCode(status),
      };
    }

    // Unknown / unhandled exceptions
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: null,
      errorCode: ErrorCode.INTERNAL_ERROR,
    };
  }
}


