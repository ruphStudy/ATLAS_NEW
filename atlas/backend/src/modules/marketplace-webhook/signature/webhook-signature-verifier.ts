import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhookVerificationResult } from '../interfaces';

@Injectable()
export class WebhookSignatureVerifier {
  private readonly logger = new Logger(WebhookSignatureVerifier.name);

  /**
   * No per-provider adapter exposes signature verification (IWebhookOperations
   * only covers register/unregister/list) — HMAC-SHA256 (falling back to
   * SHA1) is the near-universal webhook signing scheme, so it's used
   * directly rather than delegating to a provider-specific method that
   * doesn't exist.
   */
  verify(params: {
    payload: string | Buffer;
    signature: string;
    secret: string;
    timestamp?: string;
  }): WebhookVerificationResult {
    try {
      const isValid =
        this.verifyHmacSha256(params.payload, params.signature, params.secret) ||
        this.verifyHmacSha1(params.payload, params.signature, params.secret);

      return {
        valid: isValid,
        reason: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Signature verification failed: ${err.message}`);
      return {
        valid: false,
        reason: err.message,
        errors: [err.message],
      };
    }
  }

  verifyHmacSha256(payload: string | Buffer, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    
    // Support different signature formats
    const expectedSigs = [
      digest,
      `sha256=${digest}`,
      digest.toUpperCase(),
      `sha256=${digest.toUpperCase()}`,
    ];

    return expectedSigs.some((expected) => this.secureCompare(signature, expected));
  }

  verifyHmacSha1(payload: string | Buffer, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha1', secret);
    const digest = hmac.update(payload).digest('hex');
    
    const expectedSigs = [
      digest,
      `sha1=${digest}`,
    ];

    return expectedSigs.some((expected) => this.secureCompare(signature, expected));
  }

  generateHmacSha256(payload: string | Buffer, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(payload).digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
