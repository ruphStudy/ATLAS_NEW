import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HTTP_HEADERS } from '@common/constants';

/**
 * Augment the Express Request type to include requestId.
 * This declaration is picked up globally via tsconfig include paths.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * RequestIdMiddleware
 *
 * Assigns a unique request ID to every incoming HTTP request.
 * - Uses the `X-Request-ID` header from the client if provided.
 * - Otherwise generates a UUID v4.
 * - Echoes the ID back in the `X-Request-ID` response header.
 * - Attaches it to `req.requestId` for downstream use.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers[HTTP_HEADERS.REQUEST_ID];
    const requestId =
      (Array.isArray(incomingId) ? incomingId[0] : incomingId) ?? uuidv4();

    req.requestId = requestId;
    res.setHeader(HTTP_HEADERS.REQUEST_ID, requestId);

    next();
  }
}
