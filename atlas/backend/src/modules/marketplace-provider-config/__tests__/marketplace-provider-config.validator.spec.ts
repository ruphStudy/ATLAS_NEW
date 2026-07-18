import { MarketplaceProviderConfigValidator } from '../validator/marketplace-provider-config.validator';
import { MarketplaceProviderConfigPayload } from '../interfaces';
import { CONFIG_ERROR_CODES } from '../constants';

function makeValidPayload(): MarketplaceProviderConfigPayload {
  return {
    timeoutMs: 30_000,
    priority: 50,
    retryPolicy: { maxAttempts: 3, backoffMs: 1_000, backoffMultiplier: 2 },
    rateLimitConfig: { requestsPerMinute: 60, requestsPerHour: 3_000, burstLimit: 10 },
    queueConfig: { concurrency: 3, jobAttempts: 3 },
    batchProcessingConfig: { batchSize: 50 },
    apiVersion: '1.0.0',
    loggingOptions: { level: 'info' },
  };
}

describe('MarketplaceProviderConfigValidator', () => {
  let validator: MarketplaceProviderConfigValidator;

  beforeEach(() => {
    validator = new MarketplaceProviderConfigValidator();
  });

  describe('validate()', () => {
    it('passes for valid payload', () => {
      const result = validator.validate(makeValidPayload(), { providerKey: 'AMAZON_SP' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes for empty payload (all optional)', () => {
      const result = validator.validate({}, { providerKey: 'P' });
      expect(result.valid).toBe(true);
    });

    it('fails on create with empty providerKey', () => {
      const result = validator.validate({}, { providerKey: '', isCreate: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'providerKey')).toBe(true);
    });

    describe('timeout validation', () => {
      it('fails when timeoutMs < MIN', () => {
        const result = validator.validate({ timeoutMs: 500 }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === CONFIG_ERROR_CODES.INVALID_TIMEOUT)).toBe(true);
      });

      it('fails when timeoutMs > MAX', () => {
        const result = validator.validate({ timeoutMs: 200_000 }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it('passes for valid timeoutMs', () => {
        const result = validator.validate({ timeoutMs: 30_000 }, { providerKey: 'P' });
        expect(result.valid).toBe(true);
      });
    });

    describe('priority validation', () => {
      it('fails when priority < 1', () => {
        const result = validator.validate({ priority: 0 }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it('fails when priority > 1000', () => {
        const result = validator.validate({ priority: 9999 }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });
    });

    describe('retry policy validation', () => {
      it('fails when maxAttempts < 1', () => {
        const result = validator.validate({
          retryPolicy: { maxAttempts: 0, backoffMs: 1_000, backoffMultiplier: 2 },
        }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === CONFIG_ERROR_CODES.INVALID_RETRY_POLICY)).toBe(true);
      });

      it('fails when backoffMultiplier < 1', () => {
        const result = validator.validate({
          retryPolicy: { maxAttempts: 3, backoffMs: 1_000, backoffMultiplier: 0.5 },
        }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it('fails when backoffMs is negative', () => {
        const result = validator.validate({
          retryPolicy: { maxAttempts: 3, backoffMs: -1, backoffMultiplier: 2 },
        }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });
    });

    describe('rate limit validation', () => {
      it('fails when requestsPerMinute < 1', () => {
        const result = validator.validate({
          rateLimitConfig: { requestsPerMinute: 0, requestsPerHour: 100, burstLimit: 5 },
        }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === CONFIG_ERROR_CODES.INVALID_RATE_LIMIT)).toBe(true);
      });
    });

    describe('queue config validation', () => {
      it('fails when concurrency < 1', () => {
        const result = validator.validate({ queueConfig: { concurrency: 0 } }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it('fails when jobAttempts > 20', () => {
        const result = validator.validate({ queueConfig: { jobAttempts: 25 } }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });
    });

    describe('batch processing validation', () => {
      it('fails when batchSize < 1', () => {
        const result = validator.validate({ batchProcessingConfig: { batchSize: 0 } }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it('warns when batchSize exceeds recommended max', () => {
        const result = validator.validate({ batchProcessingConfig: { batchSize: 600 } }, { providerKey: 'P' });
        expect(result.valid).toBe(true); // warning, not error
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('API version validation', () => {
      it.each(['1.0.0', 'v2024-10-01', 'v2', '2.1'])('accepts valid version: %s', (v) => {
        const result = validator.validate({ apiVersion: v }, { providerKey: 'P' });
        expect(result.valid).toBe(true);
      });

      it('fails for invalid version format', () => {
        const result = validator.validate({ apiVersion: 'not-a-version!@#' }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === CONFIG_ERROR_CODES.INVALID_API_VERSION)).toBe(true);
      });
    });

    describe('logging options validation', () => {
      it('fails for invalid log level', () => {
        const result = validator.validate({ loggingOptions: { level: 'verbose' as 'debug' } }, { providerKey: 'P' });
        expect(result.valid).toBe(false);
      });

      it.each(['debug', 'info', 'warn', 'error'])('accepts valid level: %s', (level) => {
        const result = validator.validate({ loggingOptions: { level: level as 'debug' } }, { providerKey: 'P' });
        expect(result.valid).toBe(true);
      });
    });
  });
});
