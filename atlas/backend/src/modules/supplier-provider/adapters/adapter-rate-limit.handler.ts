import { Injectable, Logger } from '@nestjs/common';
import { ProviderRateLimitState } from './adapter.types';

export class RateLimitExceededError extends Error {
  constructor(
    public readonly providerCode: string,
    public readonly nextAllowedAt: Date,
  ) {
    super(`Rate limit exceeded for provider '${providerCode}'. Retry after ${nextAllowedAt.toISOString()}`);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * AdapterRateLimitHandler
 *
 * Tracks and enforces per-provider, per-workspace rate limits.
 * Uses an in-memory sliding window. Back with Redis for multi-instance.
 */
@Injectable()
export class AdapterRateLimitHandler {
  private readonly logger = new Logger(AdapterRateLimitHandler.name);
  private readonly states = new Map<string, ProviderRateLimitState>();

  private stateKey(providerCode: string, workspaceId: string): string {
    return `${providerCode}:${workspaceId}`;
  }

  /**
   * Records a request and throws RateLimitExceededError if over the limit.
   */
  checkAndRecord(
    providerCode: string,
    workspaceId: string,
    requestsPerMinute: number,
    requestsPerHour: number,
  ): void {
    const key = this.stateKey(providerCode, workspaceId);
    const now = new Date();
    let state = this.states.get(key);

    if (!state) {
      state = {
        providerCode,
        workspaceId,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        lastResetMinute: now,
        lastResetHour: now,
        nextAllowedAt: null,
      };
      this.states.set(key, state);
    }

    // Reset minute window
    if (now.getTime() - state.lastResetMinute.getTime() >= 60_000) {
      state.requestsThisMinute = 0;
      state.lastResetMinute = now;
    }

    // Reset hour window
    if (now.getTime() - state.lastResetHour.getTime() >= 3_600_000) {
      state.requestsThisHour = 0;
      state.lastResetHour = now;
    }

    // Check limits
    if (requestsPerMinute > 0 && state.requestsThisMinute >= requestsPerMinute) {
      const nextAllowed = new Date(state.lastResetMinute.getTime() + 60_000);
      state.nextAllowedAt = nextAllowed;
      this.logger.warn(`[${providerCode}] Rate limit exceeded (per-minute) for workspace ${workspaceId}`);
      throw new RateLimitExceededError(providerCode, nextAllowed);
    }

    if (requestsPerHour > 0 && state.requestsThisHour >= requestsPerHour) {
      const nextAllowed = new Date(state.lastResetHour.getTime() + 3_600_000);
      state.nextAllowedAt = nextAllowed;
      this.logger.warn(`[${providerCode}] Rate limit exceeded (per-hour) for workspace ${workspaceId}`);
      throw new RateLimitExceededError(providerCode, nextAllowed);
    }

    state.requestsThisMinute++;
    state.requestsThisHour++;
    state.nextAllowedAt = null;
  }

  /**
   * Returns remaining capacity for a provider/workspace pair.
   */
  getState(providerCode: string, workspaceId: string): ProviderRateLimitState | null {
    return this.states.get(this.stateKey(providerCode, workspaceId)) ?? null;
  }

  /**
   * Resets the rate-limit state for a provider/workspace (e.g. after receiving a rate-limit error).
   */
  handleRateLimitResponse(
    providerCode: string,
    workspaceId: string,
    retryAfterMs: number,
  ): void {
    const key = this.stateKey(providerCode, workspaceId);
    const state = this.states.get(key);
    if (state) {
      state.nextAllowedAt = new Date(Date.now() + retryAfterMs);
      this.logger.warn(
        `[${providerCode}] Provider signalled rate limit. Next allowed: ${state.nextAllowedAt.toISOString()}`,
      );
    }
  }
}
