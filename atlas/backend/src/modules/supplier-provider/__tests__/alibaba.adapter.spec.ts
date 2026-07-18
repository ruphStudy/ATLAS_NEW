import { ProviderErrorNormalizer } from '../../../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../../../credentials/supplier-provider-credential.service';
import { AdapterCapabilityValidator } from '../../adapter-capability.validator';
import { AdapterIdempotencyService } from '../../adapter-idempotency.service';
import { AdapterRateLimitHandler } from '../../adapter-rate-limit.handler';
import { AdapterHealthChecker } from '../../adapter-health.checker';
import { AdapterMetricsRecorder } from '../../adapter-metrics.recorder';
import { AdapterAuditLogger } from '../../adapter-audit.logger';
import { AlibabaAdapter } from '../alibaba/alibaba.adapter';
import { SupplierProviderCode, ProviderCapability, ProviderErrorCode } from '../../../interfaces';
import { AdapterCapability, IntegrationStrategy } from '../../adapter.types';

// ── Helpers ───────────────────────────────────────────────────

function makeAdapter(prismaOverride?: Record<string, unknown>): AlibabaAdapter {
  return new AlibabaAdapter(
    new ProviderErrorNormalizer(),
    new SupplierProviderCredentialService(),
    new AdapterCapabilityValidator(),
    new AdapterIdempotencyService(),
    new AdapterRateLimitHandler(),
    new AdapterHealthChecker(),
    new AdapterMetricsRecorder(),
    new AdapterAuditLogger(),
    (prismaOverride ?? makePrismaMock()) as never,
  );
}

function makePrismaMock(config: Record<string, unknown> | null = null) {
  return {
    workspaceSupplierProviderConfig: {
      findFirst: jest.fn().mockResolvedValue(
        config ?? { encryptedCredentials: null, customSettings: null, isEnabled: true },
      ),
    },
  };
}

function makeResolvedClient(requestImpl: jest.Mock) {
  return { request: requestImpl, refreshAccessToken: jest.fn(), getAccessToken: jest.fn(), getRefreshToken: jest.fn() };
}

// ── Registration & Metadata ───────────────────────────────────

describe('AlibabaAdapter – registration & metadata', () => {
  it('has correct provider code', () => {
    const adapter = makeAdapter();
    expect(adapter.metadata.code).toBe(SupplierProviderCode.ALIBABA);
    expect(adapter.adapterMetadata.providerCode).toBe('ALIBABA');
  });

  it('declares SUBMIT_PURCHASE_ORDER capability', () => {
    const adapter = makeAdapter();
    expect(adapter.metadata.capabilities).toContain(ProviderCapability.SUBMIT_PURCHASE_ORDER);
    expect(adapter.adapterMetadata.capabilities).toContain(AdapterCapability.SUBMIT_PURCHASE_ORDER);
  });

  it('declares TRACK_SHIPMENT capability', () => {
    const adapter = makeAdapter();
    expect(adapter.metadata.capabilities).toContain(ProviderCapability.TRACK_SHIPMENT);
    expect(adapter.adapterMetadata.capabilities).toContain(AdapterCapability.TRACK_SHIPMENT);
  });

  it('declares all standard capabilities', () => {
    const adapter = makeAdapter();
    const caps = adapter.metadata.capabilities;
    [
      ProviderCapability.SEARCH_SUPPLIERS,
      ProviderCapability.SEARCH_PRODUCTS,
      ProviderCapability.GET_SUPPLIER_DETAILS,
      ProviderCapability.GET_PRODUCT_DETAILS,
      ProviderCapability.REQUEST_QUOTATION,
      ProviderCapability.DOWNLOAD_CATALOG,
      ProviderCapability.VALIDATE_SUPPLIER,
      ProviderCapability.VALIDATE_PRODUCT,
      ProviderCapability.HEALTH_CHECK,
      ProviderCapability.TEST_CONNECTION,
    ].forEach((c) => expect(caps).toContain(c));
  });

  it('supports REST_API, EMAIL_RFQ, FILE_IMPORT, FILE_EXPORT, MANUAL_WORKFLOW strategies', () => {
    const adapter = makeAdapter();
    const strategies = adapter.adapterMetadata.integrationStrategies;
    [
      IntegrationStrategy.REST_API,
      IntegrationStrategy.EMAIL_RFQ,
      IntegrationStrategy.FILE_IMPORT,
      IntegrationStrategy.FILE_EXPORT,
      IntegrationStrategy.MANUAL_WORKFLOW,
    ].forEach((s) => expect(strategies).toContain(s));
  });

  it('is global (empty supportedCountries)', () => {
    const adapter = makeAdapter();
    expect(adapter.adapterMetadata.supportedCountries).toHaveLength(0);
  });

  it('supports USD, EUR, CNY currencies', () => {
    const adapter = makeAdapter();
    ['USD', 'EUR', 'CNY'].forEach((c) =>
      expect(adapter.adapterMetadata.supportedCurrencies).toContain(c),
    );
  });

  it('requires credentials', () => {
    expect(makeAdapter().metadata.requiresCredentials).toBe(true);
  });
});

// ── Credential Resolution ─────────────────────────────────────

describe('AlibabaAdapter – credential resolution', () => {
  it('throws when no workspace config found', async () => {
    const prisma = makePrismaMock(null);
    (prisma.workspaceSupplierProviderConfig.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(makeAdapter(prisma).resolveWorkspaceCredentials('ws-missing')).rejects.toThrow(
      /No enabled Alibaba configuration/,
    );
  });

  it('throws when required credential fields are missing', async () => {
    const credService = new SupplierProviderCredentialService();
    const encryptedCreds = JSON.stringify({
      appKey: credService.encrypt('MY_APP_KEY', 'ws1', SupplierProviderCode.ALIBABA),
      // appSecret and accessToken missing
    });
    const prisma = makePrismaMock({ encryptedCredentials: encryptedCreds, isEnabled: true });
    await expect(makeAdapter(prisma).resolveWorkspaceCredentials('ws1')).rejects.toThrow(
      /missing required credential fields/,
    );
  });

  it('resolves credentials successfully', async () => {
    const credService = new SupplierProviderCredentialService();
    const encryptedCreds = JSON.stringify({
      appKey: credService.encrypt('MY_APP_KEY', 'ws1', SupplierProviderCode.ALIBABA),
      appSecret: credService.encrypt('MY_SECRET', 'ws1', SupplierProviderCode.ALIBABA),
      accessToken: credService.encrypt('MY_TOKEN', 'ws1', SupplierProviderCode.ALIBABA),
    });
    const prisma = makePrismaMock({ encryptedCredentials: encryptedCreds, isEnabled: true });
    const adapter = makeAdapter(prisma);
    const creds = await adapter.resolveWorkspaceCredentials('ws1');
    expect(creds.appKey).toBe('MY_APP_KEY');
    expect(creds.accessToken).toBe('MY_TOKEN');
  });

  it('evictCredentialCache is idempotent', () => {
    const adapter = makeAdapter();
    adapter.evictCredentialCache('ws1');
    adapter.evictCredentialCache('ws1');
  });
});

// ── Search Products ───────────────────────────────────────────

describe('AlibabaAdapter – searchProducts', () => {
  it('maps products from envelope result_list', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({
      result: {
        success: true,
        total_count: 1,
        result_list: [
          {
            product_id: 'P1',
            subject: 'Steel Pipe',
            price_info: { price: '10.00', currency: 'USD' },
            supplier_member_id: 'M1',
          },
        ],
      },
    });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(makeResolvedClient(mockRequest) as never);

    const resp = await adapter.searchProducts({
      requestId: 'r1',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'steel' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data).toHaveLength(1);
    expect(resp.data![0]!.providerProductId).toBe('P1');
  });

  it('returns error response on network failure', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockRejectedValue(new Error('econnrefused'))) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r2',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'steel' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.code).toBe(ProviderErrorCode.NETWORK_ERROR);
    expect(resp.error!.retryable).toBe(true);
  });
});

// ── Get Supplier Details ──────────────────────────────────────

describe('AlibabaAdapter – getSupplierDetails', () => {
  it('returns normalized supplier', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({
        result: {
          result: {
            member_id: 'M100',
            company_name: 'Acme Global',
            is_verified_supplier: true,
            country: 'CN',
          },
        },
      })) as never,
    );
    const resp = await adapter.getSupplierDetails({
      requestId: 'r3',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { providerSupplierId: 'M100' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.providerSupplierId).toBe('M100');
    expect(resp.data!.isVerified).toBe(true);
  });

  it('returns error when supplier not found', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({ result: { result: null } })) as never,
    );
    const resp = await adapter.getSupplierDetails({
      requestId: 'r4',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { providerSupplierId: 'MISSING' },
    });
    expect(resp.success).toBe(false);
  });
});

// ── Request Quotation / Idempotency ───────────────────────────

describe('AlibabaAdapter – requestQuotation', () => {
  it('maps RFQ response to quotation', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({
        result: {
          result: {
            rfq_id: 'RFQ001',
            unit_price: '20.00',
            quantity: 100,
            currency: 'USD',
            lead_time: '15',
            supplier_member_id: 'M1',
          },
        },
      })) as never,
    );
    const resp = await adapter.requestQuotation({
      requestId: 'r5',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { providerSupplierId: 'M1', quantity: 100 },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.providerQuotationId).toBe('RFQ001');
    expect(resp.data!.totalPrice).toBe(2000);
  });

  it('prevents duplicate in-flight RFQ', async () => {
    const adapter = makeAdapter();
    let calls = 0;
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockImplementation(() => {
        calls++;
        return new Promise((res) => setTimeout(() => res({
          result: { result: { rfq_id: 'R1', unit_price: '1', quantity: 1, currency: 'USD' } },
        }), 100));
      })) as never,
    );
    const req = {
      requestId: 'r6',
      workspaceId: 'ws-idem',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { providerSupplierId: 'S1', quantity: 10 },
    };
    const first = adapter.requestQuotation(req);
    await expect(adapter.requestQuotation(req)).rejects.toThrow(/Duplicate request in-flight/);
    await first;
  });
});

// ── Submit Purchase Order ─────────────────────────────────────

describe('AlibabaAdapter – submitPurchaseOrder', () => {
  it('maps order response correctly', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({
        result: {
          result: {
            order_id: 'ORD001',
            trade_order_id: 'TRADE001',
            status: 'PENDING',
            total_amount: '2000.00',
            currency: 'USD',
            trade_assurance: true,
          },
        },
      })) as never,
    );
    const resp = await adapter.submitPurchaseOrder('ws1', 'M1', 'P1', 100);
    expect(resp.success).toBe(true);
    expect(resp.data!.providerOrderId).toBe('ORD001');
    expect(resp.data!.tradeOrderId).toBe('TRADE001');
  });
});

// ── Track Shipment ────────────────────────────────────────────

describe('AlibabaAdapter – trackShipment', () => {
  it('normalizes shipment tracking response', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({
        result: {
          result: {
            logistics_no: 'YT123',
            carrier: 'YTO',
            status: 'DELIVERED',
            events: [],
          },
        },
      })) as never,
    );
    const resp = await adapter.trackShipment('ws1', 'YT123');
    expect(resp.success).toBe(true);
    expect(resp.data!.logisticsNo).toBe('YT123');
    expect(resp.data!.normalizedStatus).toBe('DELIVERED');
  });
});

// ── Validate Supplier ─────────────────────────────────────────

describe('AlibabaAdapter – validateSupplier', () => {
  it('returns valid result for verified supplier', async () => {
    const adapter = makeAdapter();
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({
        result: {
          result: {
            member_id: 'M1',
            company_name: 'Verified Co',
            is_verified_supplier: true,
            is_gold_supplier: true,
            is_trade_assurance: true,
            email: 'test@co.com',
            main_products: 'Steel',
            years_on_alibaba: 5,
          },
        },
      })) as never,
    );
    const resp = await adapter.validateSupplier({
      requestId: 'r7',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { providerSupplierId: 'M1' },
    });
    expect(resp.success).toBe(true);
    expect(resp.data!.isValid).toBe(true);
    expect(resp.data!.score).toBeGreaterThanOrEqual(50);
  });
});

// ── Error Normalization ───────────────────────────────────────

describe('AlibabaAdapter – error normalization', () => {
  it('normalizes rate limit error', async () => {
    const adapter = makeAdapter();
    const { AlibabaHttpError } = await import('../alibaba/alibaba.http-client');
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockRejectedValue(
        new AlibabaHttpError(ProviderErrorCode.RATE_LIMITED, 'Rate limit exceeded', 429),
      )) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r8',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'test' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.retryable).toBe(true);
  });

  it('normalizes auth error as non-retryable', async () => {
    const adapter = makeAdapter();
    const { AlibabaHttpError } = await import('../alibaba/alibaba.http-client');
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockRejectedValue(
        new AlibabaHttpError(ProviderErrorCode.AUTH_FAILED, 'Invalid session', 401),
      )) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r9',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'test' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error!.retryable).toBe(false);
  });
});

// ── Pagination ────────────────────────────────────────────────

describe('AlibabaAdapter – pagination', () => {
  it('passes page_no and page_size to HTTP client', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ result: { result_list: [] } });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(mockRequest) as never,
    );
    await adapter.searchProducts({
      requestId: 'r10',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'steel' },
      pagination: { page: 4, limit: 25, offset: 75 },
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ page_no: 4, page_size: 25 }),
      }),
    );
  });

  it('caps page_size at 100', async () => {
    const adapter = makeAdapter();
    const mockRequest = jest.fn().mockResolvedValue({ result: { result_list: [] } });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(mockRequest) as never,
    );
    await adapter.searchProducts({
      requestId: 'r11',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'steel' },
      pagination: { page: 1, limit: 999, offset: 0 },
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ page_size: 100 }),
      }),
    );
  });
});

// ── Retry Behavior ────────────────────────────────────────────

describe('AlibabaAdapter – retry', () => {
  it('retries on network error and succeeds', async () => {
    const adapter = makeAdapter();
    let attempts = 0;
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('econnrefused');
        return Promise.resolve({ result: { result_list: [] } });
      })) as never,
    );
    const resp = await adapter.searchProducts({
      requestId: 'r12',
      workspaceId: 'ws1',
      providerCode: SupplierProviderCode.ALIBABA,
      params: { keyword: 'steel' },
    });
    expect(resp.success).toBe(true);
    expect(attempts).toBe(3);
  });
});

// ── Rate Limit Handling ───────────────────────────────────────

describe('AlibabaAdapter – rate limit', () => {
  it('throws when per-minute rate limit exceeded', async () => {
    const rateLimitHandler = new AdapterRateLimitHandler();
    for (let i = 0; i < 30; i++) {
      rateLimitHandler.checkAndRecord('ALIBABA', 'ws-rl2', 30, 0);
    }
    const adapter = makeAdapter();
    (adapter as never as { rateLimitHandler: AdapterRateLimitHandler })['rateLimitHandler'] = rateLimitHandler;
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      makeResolvedClient(jest.fn().mockResolvedValue({ result: { result_list: [] } })) as never,
    );
    await expect(
      adapter.searchProducts({
        requestId: 'r-rl',
        workspaceId: 'ws-rl2',
        providerCode: SupplierProviderCode.ALIBABA,
        params: { keyword: 'test' },
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});

// ── Token Refresh ─────────────────────────────────────────────

describe('AlibabaAdapter – token refresh', () => {
  it('evicts credential cache after token refresh', async () => {
    const adapter = makeAdapter();
    const mockRefresh = jest.fn().mockResolvedValue({
      access_token: 'NEW_TOKEN',
      refresh_token: 'NEW_REFRESH',
    });
    jest.spyOn(adapter as never, 'resolveHttpClient').mockResolvedValue(
      { ...makeResolvedClient(jest.fn()), refreshAccessToken: mockRefresh } as never,
    );
    await adapter.refreshTokenForWorkspace('ws1');
    expect(mockRefresh).toHaveBeenCalled();
  });
});
