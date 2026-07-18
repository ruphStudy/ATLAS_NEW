import { Logger } from '@nestjs/common';
import { ProviderErrorNormalizer } from '../../../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../../../credentials/supplier-provider-credential.service';
import { AdapterCapabilityValidator } from '../../adapter-capability.validator';
import { AdapterIdempotencyService } from '../../adapter-idempotency.service';
import { AdapterRateLimitHandler } from '../../adapter-rate-limit.handler';
import { AdapterHealthChecker } from '../../adapter-health.checker';
import { AdapterMetricsRecorder } from '../../adapter-metrics.recorder';
import { AdapterAuditLogger } from '../../adapter-audit.logger';
import { IndiaMartAdapter } from '../indiamart/indiamart.adapter';
import { SupplierProviderCode, ProviderCapability, ProviderErrorCode } from '../../../interfaces';
import { AdapterCapability, IntegrationStrategy } from '../../adapter.types';
import { IndiaMartHttpClient } from '../indiamart/indiamart.http-client';
import {
  INDIAMART_ADAPTER_CAPABILITIES,
  INDIAMART_INTEGRATION_STRATEGIES,
} from './helpers/indiamart.test-helpers';

// ── Test Helpers ──────────────────────────────────────────────

function makeAdapter(overrides: Partial<{
  prisma: Record<string, unknown>;
}> = {}): IndiaMartAdapter {
  const errorNormalizer = new ProviderErrorNormalizer();
  const credService = new SupplierProviderCredentialService();
  const capValidator = new AdapterCapabilityValidator();
  const idempotency = new AdapterIdempotencyService();
  const rateLimitHandler = new AdapterRateLimitHandler();
  const healthChecker = new AdapterHealthChecker();
  const metricsRecorder = new AdapterMetricsRecorder();
  const auditLogger = new AdapterAuditLogger();

  const prisma = overrides.prisma ?? makePrismaMock();

  return new IndiaMartAdapter(
    errorNormalizer,
    credService,
    capValidator,
    idempotency,
    rateLimitHandler,
    healthChecker,
    metricsRecorder,
    auditLogger,
    prisma as never,
  );
}

function makePrismaMock(config: Record<string, unknown> | null = null) {
  return {
    workspaceSupplierProviderConfig: {
      findFirst: jest.fn().mockResolvedValue(
        config ?? {
          encryptedCredentials: null,
          customSettings: null,
          isEnabled: true,
        },
      ),
    },
  };
}

// ── Registration & Metadata ───────────────────────────────────

describe('IndiaMartAdapter – registration & metadata', () => {
  let adapter: IndiaMartAdapter;

  beforeEach(() => {
    adapter = makeAdapter();
  });

  it('has correct provider code', () => {
    expect(adapter.metadata.code).toBe(SupplierProviderCode.INDIAMART);
    expect(adapter.adapterMetadata.providerCode).toBe('INDIAMART');
  });

  it('declares all expected capabilities', () => {
    const providerCaps = adapter.metadata.capabilities;
    expect(providerCaps).toContain(ProviderCapability.SEARCH_SUPPLIERS);
    expect(providerCaps).toContain(ProviderCapability.SEARCH_PRODUCTS);
    expect(providerCaps).toContain(ProviderCapability.GET_SUPPLIER_DETAILS);
    expect(providerCaps).toContain(ProviderCapability.GET_PRODUCT_DETAILS);
    expect(providerCaps).toContain(ProviderCapability.REQUEST_QUOTATION);
    expect(providerCaps).toContain(ProviderCapability.DOWNLOAD_CATALOG);
    expect(providerCaps).toContain(ProviderCapability.VALIDATE_SUPPLIER);
    expect(providerCaps).toContain(ProviderCapability.VALIDATE_PRODUCT);
    expect(providerCaps).toContain(ProviderCapability.HEALTH_CHECK);
    expect(providerCaps).toContain(ProviderCapability.TEST_CONNECTION);
  });

  it('does NOT declare SUBMIT_PURCHASE_ORDER', () => {
    expect(adapter.metadata.capabilities).not.toContain(ProviderCapability.SUBMIT_PURCHASE_ORDER);
  });

  it('does NOT declare TRACK_SHIPMENT', () => {
    expect(adapter.metadata.capabilities).not.toContain(ProviderCapability.TRACK_SHIPMENT);
  });

  it('supports REST_API integration strategy', () => {
    expect(adapter.adapterMetadata.integrationStrategies).toContain(IntegrationStrategy.REST_API);
  });

  it('supports EMAIL_RFQ integration strategy', () => {
    expect(adapter.adapterMetadata.integrationStrategies).toContain(IntegrationStrategy.EMAIL_RFQ);
  });

  it('supports FILE_IMPORT strategy', () => {
    expect(adapter.adapterMetadata.integrationStrategies).toContain(IntegrationStrategy.FILE_IMPORT);
  });

  it('supports India as primary country', () => {
    expect(adapter.adapterMetadata.supportedCountries).toContain('IN');
  });

  it('supports INR and USD currencies', () => {
    expect(adapter.adapterMetadata.supportedCurrencies).toContain('INR');
    expect(adapter.adapterMetadata.supportedCurrencies).toContain('USD');
  });

  it('requires credentials', () => {
    expect(adapter.metadata.requiresCredentials).toBe(true);
    expect(adapter.adapterMetadata.requiresCredentials).toBe(true);
  });

  it('supportsCapability returns true for search suppliers', () => {
    expect(adapter.supportsCapability(ProviderCapability.SEARCH_SUPPLIERS)).toBe(true);
  });

  it('supportsCapability returns false for SUBMIT_PURCHASE_ORDER', () => {
    expect(adapter.supportsCapability(ProviderCapability.SUBMIT_PURCHASE_ORDER)).toBe(false);
  });

  it('supportsAdapterCapability returns true for SEARCH_PRODUCTS', () => {
    expect(adapter.supportsAdapterCapability(AdapterCapability.SEARCH_PRODUCTS)).toBe(true);
  });

  it('supportsCountry returns true for IN', () => {
    expect(adapter.supportsCountry('IN')).toBe(true);
  });
});

// ── Credential Resolution ─────────────────────────────────────

describe('IndiaMartAdapter – credential resolution', () => {
  it('throws when workspace config not found', async () => {
    const prisma = makePrismaMock(null);
    (prisma.workspaceSupplierProviderConfig.findFirst as jest.Mock).mockResolvedValue(null);
    const adapter = makeAdapter({ prisma });

    await expect(adapter.resolveWorkspaceCredentials('ws-unknown')).rejects.toThrow(
      /No enabled IndiaMART configuration/,
    );
  });

  it('resolves credentials from workspace config', async () => {
    const credService = new SupplierProviderCredentialService();
    const rawApiKey = 'test-api-key-value';
    const encryptedKey = credService.encrypt(rawApiKey, 'ws1', SupplierProviderCode.INDIAMART);

    const encryptedCreds = JSON.stringify({ apiKey: encryptedKey });
    const prisma = makePrismaMock({ encryptedCredentials: encryptedCreds, isEnabled: true, customSettings: null });

    const adapter = makeAdapter({ prisma });
    const resolved = await adapter.resolveWorkspaceCredentials('ws1');
    expect(resolved.apiKey).toBe(rawApiKey);
  });

  it('evicts credential cache on demand', async () => {
    const adapter = makeAdapter();
    // Populate cache by resolving credentials
    adapter.evictCredentialCache('ws1');
    // Should not throw — just removes entry
    adapter.evictCredentialCache('ws1'); // idempotent
  });
});

// ── Search Products ───────────────────────────────────────────

describe('IndiaMartAdapter – searchProducts', () => {
  it('returns error response when HTTP client throws', async () => {
    const adapter = makeAdapter();

    // Inject a failing HTTP client by patching private method
    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockRejectedValue(new Error('econnrefused')),
    } as never);

    const response = await adapter.searchProducts({
      requestId: 'req1',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'steel' },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error!.providerCode).toBe(SupplierProviderCode.INDIAMART);
  });

  it('maps products from envelope Response array', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({
        Status: 200,
        Response: [
          {
            PPID: 'P1',
            PRODUCT_NAME: 'Steel Bar',
            PRICE: '100',
            CURRENCY: 'INR',
            UNIT: 'KG',
            MIN_ORDER_QUANTITY: '50',
            SUPPLIER_GLID: 'G1',
          },
        ],
      }),
    } as never);

    const response = await adapter.searchProducts({
      requestId: 'req2',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'steel' },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(1);
    expect(response.data![0]!.providerProductId).toBe('P1');
    expect(response.data![0]!.name).toBe('Steel Bar');
  });
});

// ── Get Supplier Details ──────────────────────────────────────

describe('IndiaMartAdapter – getSupplierDetails', () => {
  it('returns normalized supplier on success', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({
        Status: 200,
        Response: {
          GLID: 'G100',
          COMPANY_NAME: 'Acme Pvt Ltd',
          TRUST_SEAL: 'Yes',
          RATING: '4.8',
          COUNTRY: 'IN',
        },
      }),
    } as never);

    const response = await adapter.getSupplierDetails({
      requestId: 'req3',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'G100' },
    });

    expect(response.success).toBe(true);
    expect(response.data!.providerSupplierId).toBe('G100');
    expect(response.data!.name).toBe('Acme Pvt Ltd');
    expect(response.data!.isVerified).toBe(true);
  });

  it('returns error response when supplier not found', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({ Status: 200, Response: null }),
    } as never);

    const response = await adapter.getSupplierDetails({
      requestId: 'req4',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'NOTFOUND' },
    });

    expect(response.success).toBe(false);
  });
});

// ── Request Quotation (idempotency) ───────────────────────────

describe('IndiaMartAdapter – requestQuotation', () => {
  it('maps lead response to quotation', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({
        Status: 200,
        Response: {
          LEAD_ID: 'L999',
          UNIT_PRICE: '300',
          QUANTITY: '50',
          CURRENCY: 'INR',
          LEAD_TIME: '10',
          SUPPLIER_GLID: 'G100',
          PRODUCT_PPID: 'P1',
        },
      }),
    } as never);

    const response = await adapter.requestQuotation({
      requestId: 'req5',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'G100', providerProductId: 'P1', quantity: 50 },
    });

    expect(response.success).toBe(true);
    expect(response.data!.providerQuotationId).toBe('L999');
    expect(response.data!.totalPrice).toBe(15_000);
  });

  it('prevents duplicate in-flight RFQ submission', async () => {
    const adapter = makeAdapter();
    let callCount = 0;

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockImplementation(() => {
        callCount++;
        return new Promise((resolve) => setTimeout(() => resolve({
          Status: 200,
          Response: { LEAD_ID: 'L1', UNIT_PRICE: '0', QUANTITY: '1', CURRENCY: 'INR' },
        }), 100));
      }),
    } as never);

    const req = {
      requestId: 'req6',
      workspaceId: 'ws2',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'G200', quantity: 10 },
    };

    // First call runs; second should detect pending and throw
    const firstCall = adapter.requestQuotation(req);
    await expect(adapter.requestQuotation(req)).rejects.toThrow(/Duplicate request in-flight/);
    await firstCall; // let first finish
  });
});

// ── Validate Supplier ─────────────────────────────────────────

describe('IndiaMartAdapter – validateSupplier', () => {
  it('returns invalid result for missing supplier', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({ Status: 200, Response: null }),
    } as never);

    const response = await adapter.validateSupplier({
      requestId: 'req7',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'G_MISSING' },
    });

    expect(response.success).toBe(true);
    expect(response.data!.isValid).toBe(false);
  });

  it('returns valid result for verified supplier', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({
        Status: 200,
        Response: {
          GLID: 'G1',
          COMPANY_NAME: 'Verified Co',
          TRUST_SEAL: 'Yes',
          phone_number: '+91999',
          MAIN_PRODUCTS: 'Steel',
        },
      }),
    } as never);

    const response = await adapter.validateSupplier({
      requestId: 'req8',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { providerSupplierId: 'G1' },
    });

    expect(response.success).toBe(true);
    expect(response.data!.isValid).toBe(true);
    expect(response.data!.score).toBeGreaterThanOrEqual(50);
  });
});

// ── Error Normalization ───────────────────────────────────────

describe('IndiaMartAdapter – error normalization', () => {
  it('normalizes network error in searchProducts', async () => {
    const adapter = makeAdapter();

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockRejectedValue(new Error('econnrefused')),
    } as never);

    const response = await adapter.searchProducts({
      requestId: 'req9',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'test' },
    });

    expect(response.success).toBe(false);
    expect(response.error!.code).toBe(ProviderErrorCode.NETWORK_ERROR);
    expect(response.error!.retryable).toBe(true);
  });

  it('normalizes auth error', async () => {
    const adapter = makeAdapter();
    const { IndiaMartHttpError } = await import('../indiamart/indiamart.http-client');

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockRejectedValue(
        new IndiaMartHttpError(ProviderErrorCode.AUTH_FAILED, 'Unauthorized', 401),
      ),
    } as never);

    const response = await adapter.searchProducts({
      requestId: 'req10',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'test' },
    });

    expect(response.success).toBe(false);
    expect(response.error!.retryable).toBe(false);
  });
});

// ── Pagination ────────────────────────────────────────────────

describe('IndiaMartAdapter – pagination', () => {
  it('passes page and limit to HTTP client', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ Status: 200, Response: [] });

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: mockRequest,
    } as never);

    await adapter.searchProducts({
      requestId: 'req11',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'steel' },
      pagination: { page: 3, limit: 50, offset: 100 },
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ page: 3, per_page: 50 }),
      }),
    );
  });

  it('caps limit at INDIAMART_MAX_PAGE_SIZE (100)', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ Status: 200, Response: [] });

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: mockRequest,
    } as never);

    await adapter.searchProducts({
      requestId: 'req12',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'steel' },
      pagination: { page: 1, limit: 9999, offset: 0 },
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ per_page: 100 }),
      }),
    );
  });
});

// ── Rate Limit Handling ───────────────────────────────────────

describe('IndiaMartAdapter – rate limit', () => {
  it('throws RateLimitExceededError when limit exceeded', async () => {
    const rateLimitHandler = new AdapterRateLimitHandler();

    // Fill up the rate limit
    for (let i = 0; i < 60; i++) {
      rateLimitHandler.checkAndRecord('INDIAMART', 'ws-rl', 60, 0);
    }

    const adapter = makeAdapter();
    // Override rate limit handler with the pre-filled one
    (adapter as never as { rateLimitHandler: AdapterRateLimitHandler })['rateLimitHandler'] = rateLimitHandler;

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockResolvedValue({ Status: 200, Response: [] }),
    } as never);

    await expect(
      adapter.searchProducts({
        requestId: 'req-rl',
        workspaceId: 'ws-rl',
        providerCode: SupplierProviderCode.INDIAMART,
        params: { keyword: 'test' },
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});

// ── Unsupported Capabilities ──────────────────────────────────

describe('IndiaMartAdapter – unsupported capabilities', () => {
  it('supportsCapability returns false for SUBMIT_PURCHASE_ORDER', () => {
    const adapter = makeAdapter();
    expect(adapter.supportsCapability(ProviderCapability.SUBMIT_PURCHASE_ORDER)).toBe(false);
  });

  it('supportsCapability returns false for TRACK_SHIPMENT', () => {
    const adapter = makeAdapter();
    expect(adapter.supportsCapability(ProviderCapability.TRACK_SHIPMENT)).toBe(false);
  });

  it('supportsAdapterCapability returns false for SUBMIT_PURCHASE_ORDER', () => {
    const adapter = makeAdapter();
    expect(adapter.supportsAdapterCapability(AdapterCapability.SUBMIT_PURCHASE_ORDER)).toBe(false);
  });
});

// ── Retry Behavior ────────────────────────────────────────────

describe('IndiaMartAdapter – retry behavior', () => {
  it('retries on network error and eventually succeeds', async () => {
    const adapter = makeAdapter();
    let attempts = 0;

    jest.spyOn(adapter as never, 'resolveHttpClient').mockReturnValue({
      request: jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('econnrefused');
        return Promise.resolve({ Status: 200, Response: [] });
      }),
    } as never);

    const response = await adapter.searchProducts({
      requestId: 'req-retry',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.INDIAMART,
      params: { keyword: 'steel' },
    });

    expect(response.success).toBe(true);
    expect(attempts).toBe(3);
  });
});
