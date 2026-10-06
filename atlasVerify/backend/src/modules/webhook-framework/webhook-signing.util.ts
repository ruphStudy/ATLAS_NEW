import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { WEBHOOK_SECRET_BYTES, WEBHOOK_SIGNATURE_ALGORITHM } from './constants';

export interface IWebhookSignature {
  timestamp: number;
  signature: string;
}

/** High-entropy signing secret, shown once at creation/rotation time — mirrors `generateApiKey()`'s secret generation. */
export function generateWebhookSecret(): string {
  return randomBytes(WEBHOOK_SECRET_BYTES).toString('base64url');
}

/**
 * Signs an outgoing webhook body the same way Stripe's inbound signature
 * verification expects (`${timestamp}.${rawBody}` HMAC-SHA256), binding a
 * timestamp into the signed string so receivers can enforce a freshness
 * window and reject replays.
 */
export function signWebhookPayload(rawBody: string, secret: string, timestamp: number = Date.now()): IWebhookSignature {
  const signature = createHmac(WEBHOOK_SIGNATURE_ALGORITHM, secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return { timestamp, signature };
}

/** Exposed for completeness/future inbound verification needs — compares with `timingSafeEqual`, never `===`. */
export function verifyWebhookSignature(rawBody: string, secret: string, timestamp: number, providedSignature: string): boolean {
  const expected = createHmac(WEBHOOK_SIGNATURE_ALGORITHM, secret).update(`${timestamp}.${rawBody}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedSignature, 'hex'));
  } catch {
    return false;
  }
}
