import { AdapterRateLimitHandler, RateLimitExceededError } from '../adapters/adapter-rate-limit.handler';

describe('AdapterRateLimitHandler', () => {
  let handler: AdapterRateLimitHandler;

  beforeEach(() => {
    handler = new AdapterRateLimitHandler();
  });

  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(() =>
        handler.checkAndRecord('INDIAMART', 'ws1', 10, 0),
      ).not.toThrow();
    }
  });

  it('throws RateLimitExceededError when per-minute limit is hit', () => {
    for (let i = 0; i < 3; i++) {
      handler.checkAndRecord('TRADEINDIA', 'ws1', 3, 0);
    }
    expect(() => handler.checkAndRecord('TRADEINDIA', 'ws1', 3, 0)).toThrow(
      RateLimitExceededError,
    );
  });

  it('does not apply limit when requestsPerMinute is 0', () => {
    for (let i = 0; i < 100; i++) {
      expect(() => handler.checkAndRecord('ALIBABA', 'ws1', 0, 0)).not.toThrow();
    }
  });

  it('isolates rate limits per workspace', () => {
    for (let i = 0; i < 2; i++) {
      handler.checkAndRecord('INDIAMART', 'wsA', 2, 0);
    }
    // wsA is at limit but wsB should still be allowed
    expect(() => handler.checkAndRecord('INDIAMART', 'wsB', 2, 0)).not.toThrow();
    expect(() => handler.checkAndRecord('INDIAMART', 'wsA', 2, 0)).toThrow(RateLimitExceededError);
  });

  it('returns null state for unknown provider/workspace', () => {
    expect(handler.getState('UNKNOWN', 'ws1')).toBeNull();
  });

  it('recordRateLimitResponse sets nextAllowedAt', () => {
    handler.checkAndRecord('INDIAMART', 'ws1', 100, 0);
    handler.handleRateLimitResponse('INDIAMART', 'ws1', 5_000);
    const state = handler.getState('INDIAMART', 'ws1');
    expect(state?.nextAllowedAt).not.toBeNull();
    expect(state!.nextAllowedAt!.getTime()).toBeGreaterThan(Date.now());
  });
});
