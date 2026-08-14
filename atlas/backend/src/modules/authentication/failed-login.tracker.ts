import { Injectable } from '@nestjs/common';
import { AUTH_CONSTANTS } from './constants';

interface FailedAttemptWindow {
  count: number;
  firstAttemptAt: number;
}

/**
 * FailedLoginTracker
 *
 * In-memory, per-email sliding-window lockout — brute-force protection that
 * complements the IP-based `ThrottlerGuard` on the login route (an attacker
 * rotating IPs against one account is still rate-limited here). Single
 * source of truth per process; acceptable for "Part 1" readiness (matches
 * the existing in-memory-cache pattern already used elsewhere, e.g.
 * `AmazonAuthService.tokenCache`).
 */
@Injectable()
export class FailedLoginTracker {
  private readonly attempts = new Map<string, FailedAttemptWindow>();

  isLocked(email: string): boolean {
    const entry = this.attempts.get(this.key(email));
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.attempts.delete(this.key(email));
      return false;
    }

    return entry.count >= AUTH_CONSTANTS.LOGIN_LOCKOUT_THRESHOLD;
  }

  recordFailure(email: string): void {
    const key = this.key(email);
    const existing = this.attempts.get(key);

    if (!existing || this.isExpired(existing)) {
      this.attempts.set(key, { count: 1, firstAttemptAt: Date.now() });
      return;
    }

    existing.count += 1;
  }

  reset(email: string): void {
    this.attempts.delete(this.key(email));
  }

  private isExpired(entry: FailedAttemptWindow): boolean {
    return Date.now() - entry.firstAttemptAt > AUTH_CONSTANTS.LOGIN_LOCKOUT_WINDOW_MS;
  }

  private key(email: string): string {
    return email.toLowerCase();
  }
}
