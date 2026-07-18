import { MarketplaceResponseWrapper } from '../context/marketplace-response.wrapper';
import { MarketplaceErrorCode, NormalizedMarketplaceError } from '../interfaces';

const baseMeta = {
  providerKey: 'TEST_PROVIDER',
  correlationId: 'corr-123',
  requestId: 'req-456',
  processingTimeMs: 120,
};

describe('MarketplaceResponseWrapper', () => {
  describe('success()', () => {
    it('returns success response with result', () => {
      const res = MarketplaceResponseWrapper.success({ id: '1', name: 'test' }, baseMeta);
      expect(res.success).toBe(true);
      expect(res.result).toEqual({ id: '1', name: 'test' });
      expect(res.errors).toHaveLength(0);
    });

    it('includes warnings', () => {
      const res = MarketplaceResponseWrapper.success({}, baseMeta, ['partial data']);
      expect(res.warnings).toContain('partial data');
    });

    it('sets all meta fields', () => {
      const res = MarketplaceResponseWrapper.success({}, baseMeta);
      expect(res.meta.providerKey).toBe('TEST_PROVIDER');
      expect(res.meta.correlationId).toBe('corr-123');
      expect(res.meta.requestId).toBe('req-456');
      expect(res.meta.processingTimeMs).toBe(120);
    });
  });

  describe('failure()', () => {
    it('returns failure response with errors', () => {
      const error: NormalizedMarketplaceError = {
        code: MarketplaceErrorCode.RATE_LIMITED,
        message: 'Rate limit exceeded',
        providerKey: 'TEST_PROVIDER',
        retryable: true,
      };
      const res = MarketplaceResponseWrapper.failure([error], baseMeta);
      expect(res.success).toBe(false);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]!.code).toBe(MarketplaceErrorCode.RATE_LIMITED);
    });
  });

  describe('fromError()', () => {
    it('wraps single error', () => {
      const error: NormalizedMarketplaceError = {
        code: MarketplaceErrorCode.AUTH_FAILED,
        message: 'Auth failed',
        providerKey: 'TEST_PROVIDER',
        retryable: false,
      };
      const res = MarketplaceResponseWrapper.fromError(error, baseMeta);
      expect(res.success).toBe(false);
      expect(res.errors).toHaveLength(1);
    });
  });
});
