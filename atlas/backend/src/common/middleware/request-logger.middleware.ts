import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * RequestLoggerMiddleware
 *
 * Logs every HTTP request on completion:
 *   METHOD /path → statusCode (durationMs) [requestId]
 *
 * Uses the `finish` event on the response so the status code is available.
 * Pino HTTP handles structured logging in production; this adds a concise
 * one-liner during development.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const requestId = req.requestId ?? 'no-id';

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        `${method} ${originalUrl} → ${statusCode} (${duration}ms) [${requestId}]`,
      );
    });

    next();
  }
}
