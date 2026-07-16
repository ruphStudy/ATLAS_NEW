import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

/**
 * TransformInterceptor
 *
 * Wraps every successful response in the standard ATLAS API envelope:
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": <payload>,
 *   "meta": {},
 *   "timestamp": "ISO-8601",
 *   "requestId": "uuid"
 * }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: 'Success',
        data,
        meta: {},
        timestamp: new Date().toISOString(),
        requestId: req.requestId ?? 'unknown',
      })),
    );
  }
}

