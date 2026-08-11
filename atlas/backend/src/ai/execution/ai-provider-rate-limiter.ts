import { Injectable } from '@nestjs/common';

interface IWindowCounter {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 60_000;

/**
 * AiProviderRateLimiter
 *
 * Fixed-window request counter, scoped per provider + workspace. Kept as a
 * minimal in-memory hook rather than a shared infra dependency — no
 * distributed rate limiter exists elsewhere in the codebase to reuse.
 */
@Injectable()
export class AiProviderRateLimiter {
  private readonly windows = new Map<string, IWindowCounter>();

  tryConsume(providerKey: string, workspaceId: string, maxPerMinute: number): boolean {
    const key = `${providerKey}:${workspaceId}`;
    const now = Date.now();
    const currentWindowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;

    const counter = this.windows.get(key);
    if (!counter || counter.windowStart !== currentWindowStart) {
      this.windows.set(key, { windowStart: currentWindowStart, count: 1 });
      return true;
    }

    if (counter.count >= maxPerMinute) {
      return false;
    }

    counter.count += 1;
    return true;
  }

  reset(): void {
    this.windows.clear();
  }
}
