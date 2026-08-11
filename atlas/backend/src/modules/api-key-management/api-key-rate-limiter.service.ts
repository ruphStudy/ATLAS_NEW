import { Injectable } from '@nestjs/common';
import { DEFAULT_RATE_LIMIT_WINDOW_MS } from './constants';

interface IWindowEntry {
  windowStart: number;
  count: number;
}

/**
 * In-process sliding-window rate limiter keyed by API key id — a
 * self-contained, additive check that never touches the global
 * `ThrottlerModule` configuration (which is IP/route-keyed, not per-key).
 * Resets per instance on restart; acceptable for a per-key soft limit that
 * is advisory configuration on the key itself, not a hard infrastructure
 * guarantee.
 */
@Injectable()
export class ApiKeyRateLimiterService {
  private readonly windows = new Map<string, IWindowEntry>();

  /** Returns `true` if the request is within the configured per-minute limit; always `true` when no limit is configured. */
  checkAndConsume(apiKeyId: string, limitPerMinute: number | null): boolean {
    if (!limitPerMinute) {
      return true;
    }

    const now = Date.now();
    const entry = this.windows.get(apiKeyId);

    if (!entry || now - entry.windowStart >= DEFAULT_RATE_LIMIT_WINDOW_MS) {
      this.windows.set(apiKeyId, { windowStart: now, count: 1 });
      return true;
    }

    if (entry.count >= limitPerMinute) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  reset(apiKeyId: string): void {
    this.windows.delete(apiKeyId);
  }
}
