import { Injectable } from '@nestjs/common';

interface IWindowCounter {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 60_000;

/**
 * Fixed-window request counter, mirroring
 * src/ai/execution/ai-provider-rate-limiter.ts exactly. A minimal in-memory
 * hook rather than a shared infra dependency — no distributed rate limiter
 * exists elsewhere in this codebase.
 */
@Injectable()
export class NotificationProviderRateLimiter {
  private readonly windows = new Map<string, IWindowCounter>();

  tryConsume(providerKey: string, workspaceId: string, maxPerMinute: number): boolean {
    const key = `${providerKey}:${workspaceId}`;
    const currentWindowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
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
