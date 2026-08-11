import { Injectable } from '@nestjs/common';
import { INormalizedPaymentError } from '../interfaces';

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Provider-agnostic error normalization — pattern-matches whatever an
 * adapter threw/returned into a stable shape the rest of this module can
 * reason about, without needing to know Stripe's vs Razorpay's specific
 * error envelope. Never logs or surfaces credential/secret values.
 */
@Injectable()
export class PaymentErrorNormalizer {
  normalize(error: unknown, providerKey: string): INormalizedPaymentError {
    if (error instanceof Error && error.name === 'AbortError') {
      return { code: 'TIMEOUT', message: 'The payment provider request timed out', providerKey, retryable: true };
    }

    const httpStatus = this.extractHttpStatus(error);
    const message = error instanceof Error ? error.message : 'Unknown payment provider error';

    return {
      code: httpStatus ? `HTTP_${httpStatus}` : 'UNKNOWN',
      message,
      providerKey,
      httpStatus,
      retryable: httpStatus ? RETRYABLE_HTTP_STATUSES.has(httpStatus) : false,
    };
  }

  isRetryable(error: unknown, providerKey: string): boolean {
    return this.normalize(error, providerKey).retryable;
  }

  private extractHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: unknown }).status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }
}
