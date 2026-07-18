import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierAdapterRegistry } from '../adapters/supplier-adapter.registry';
import { ISupplierAdapterContract } from '../adapters/adapter.contract';
import {
  AdapterCapability,
  AdapterMetadata,
  AdapterRequestContext,
  AdapterAuditEvent,
  AdapterMetricEvent,
  AdapterPaginationInput,
  AdapterPaginationOutput,
  AdapterResponseMetadata,
  ExternalReference,
  IntegrationStrategy,
  AdapterError,
} from '../adapters/adapter.types';

function makeAdapter(providerCode: string, capabilities: AdapterCapability[] = []): ISupplierAdapterContract {
  const meta: AdapterMetadata = {
    providerCode,
    displayName: providerCode,
    description: '',
    version: { major: 1, minor: 0, patch: 0 },
    supportedRegions: [],
    supportedCountries: ['IN'],
    supportedCurrencies: ['INR', 'USD'],
    capabilities,
    integrationStrategies: [IntegrationStrategy.REST_API],
    rateLimitPerMinute: 60,
    timeoutMs: 10_000,
    maxRetries: 3,
    requiresCredentials: false,
    credentialFields: [],
  };

  return {
    adapterMetadata: meta,
    supportsAdapterCapability: (cap) => capabilities.includes(cap),
    supportsStrategy: (s) => s === IntegrationStrategy.REST_API,
    supportsCountryCode: (c) => ['IN'].includes(c.toUpperCase()),
    supportsCurrency: (c) => ['INR', 'USD'].includes(c.toUpperCase()),
    checkHealth: async () => ({ providerCode, status: 'HEALTHY', checkedAt: new Date(), strategy: IntegrationStrategy.REST_API }),
    testConnection: async () => ({ providerCode, status: 'HEALTHY', checkedAt: new Date(), strategy: IntegrationStrategy.REST_API }),
    buildRequestContext: () => ({} as AdapterRequestContext),
    recordMetric: () => {},
    recordAuditEvent: () => {},
    normalizePagination: (input: AdapterPaginationInput): AdapterPaginationOutput => ({
      page: input.page,
      limit: input.limit,
      offset: (input.page - 1) * input.limit,
      hasMore: false,
    }),
    buildResponseMetadata: () => ({} as AdapterResponseMetadata),
    buildExternalReference: (id: string): ExternalReference => ({
      providerCode, externalId: id, syncedAt: new Date(),
    }),
    mapError: (e: unknown): AdapterError => ({
      code: 'UNKNOWN',
      message: String(e),
      providerCode,
      retryable: false,
    }),
  };
}

describe('SupplierAdapterRegistry', () => {
  let registry: SupplierAdapterRegistry;

  beforeEach(() => {
    registry = new SupplierAdapterRegistry();
  });

  it('registers an adapter', () => {
    const adapter = makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]);
    registry.register(adapter);
    expect(registry.isRegistered('INDIAMART')).toBe(true);
  });

  it('throws ConflictException on duplicate registration', () => {
    const adapter = makeAdapter('INDIAMART');
    registry.register(adapter);
    expect(() => registry.register(adapter)).toThrow(ConflictException);
  });

  it('retrieves adapter by provider code (case-insensitive)', () => {
    registry.register(makeAdapter('ALIBABA'));
    expect(registry.get('alibaba')).toBeDefined();
    expect(registry.get('ALIBABA')).toBeDefined();
  });

  it('throws NotFoundException for unknown provider', () => {
    expect(() => registry.get('UNKNOWN_PROVIDER')).toThrow(NotFoundException);
  });

  it('returns capable adapters for a capability', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]));
    registry.register(makeAdapter('TRADEINDIA', [AdapterCapability.REQUEST_QUOTATION]));

    const capable = registry.getCapable(AdapterCapability.SEARCH_SUPPLIERS);
    expect(capable).toHaveLength(1);
    expect(capable[0]!.adapterMetadata.providerCode).toBe('INDIAMART');
  });

  it('returns adapters by strategy', () => {
    registry.register(makeAdapter('ALIBABA'));
    const byStrategy = registry.getByStrategy(IntegrationStrategy.REST_API);
    expect(byStrategy.length).toBeGreaterThanOrEqual(1);
  });

  it('lists all metadata', () => {
    registry.register(makeAdapter('INDIAMART'));
    registry.register(makeAdapter('TRADEINDIA'));
    expect(registry.listMetadata()).toHaveLength(2);
  });
});
