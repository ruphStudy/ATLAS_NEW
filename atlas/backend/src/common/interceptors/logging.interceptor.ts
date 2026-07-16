import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import type { Request } from 'express';

/**
 * LoggingInterceptor
 *
 * Logs request duration for every handled route.
 * Used when Pino HTTP is not available (e.g. unit tests, CLI contexts).
 * In production, Pino HTTP provides structured logging; this adds a concise fallback.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const requestId = req.requestId ?? 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.debug(
          `${method} ${url} → ${duration}ms [${requestId}]`,
        );
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - start;
        this.logger.error(
          `${method} ${url} → ERROR ${duration}ms [${requestId}]`,
        );
        return throwError(() => err);
      }),
    );
  }
}

