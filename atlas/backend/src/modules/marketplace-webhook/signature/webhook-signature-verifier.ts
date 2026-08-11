import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhookAdapter, WebhookVerificationResult } from '../interfaces';

@Injectable()
export class WebhookSignatureVerifier {
  private readonly logger = new Logger(WebhookSignatureVerifier.name);

  verify(params: {
    adapter: WebhookAdapter;
    payload: string | Buffer;
    signature: string;
    secret: string;
    timestamp?: string;
  }): WebhookVerificationResult {
    try {
      const isValid = params.adapter.verifySignature({
        payload: params.payload,
        signature: params.signature,
        secret: params.secret,
        timestamp: params.timestamp,
      });

      return {
        valid: isValid,
        reason: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return {
        valid: false,
        reason: error.message,
        errors: [error.message],
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
