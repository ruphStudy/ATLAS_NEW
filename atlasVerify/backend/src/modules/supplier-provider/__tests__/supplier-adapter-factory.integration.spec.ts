import { SupplierAdapterFactoryIntegration } from '../adapters/supplier-adapter-factory.integration';
import { SupplierAdapterRegistry } from '../adapters/supplier-adapter.registry';
import { ISupplierAdapterContract } from '../adapters/adapter.contract';
import {
  AdapterCapability,
  AdapterMetadata,
  AdapterPaginationInput,
  AdapterPaginationOutput,
  AdapterRequestContext,
  AdapterResponseMetadata,
  AdapterAuditEvent,
  AdapterMetricEvent,
  AdapterError,
  ExternalReference,
  IntegrationStrategy,
} from '../adapters/adapter.types';

function makeAdapter(
  providerCode: string,
  capabilities: AdapterCapability[],
  strategies: IntegrationStrategy[] = [IntegrationStrategy.REST_API],
  countries: string[] = [],
  currencies: string[] = [],
): ISupplierAdapterContract {
  const meta: AdapterMetadata = {
    providerCode,
    displayName: providerCode,
    description: '',
    version: { major: 1, minor: 0, patch: 0 },
    supportedRegions: [],
    supportedCountries: countries,
    supportedCurrencies: currencies,
    capabilities,
    integrationStrategies: strategies,
    rateLimitPerMinute: 60,
    timeoutMs: 10_000,
    maxRetries: 3,
    requiresCredentials: false,
    credentialFields: [],
  };
  return {
    adapterMetadata: meta,
    supportsAdapterCapability: (c) => capabilities.includes(c),
    supportsStrategy: (s) => strategies.includes(s),
    supportsCountryCode: (c) => countries.length === 0 || countries.includes(c.toUpperCase()),
    supportsCurrency: (c) => currencies.length === 0 || currencies.includes(c.toUpperCase()),
    checkHealth: async () => ({ providerCode, status: 'HEALTHY', checkedAt: new Date(), strategy: IntegrationStrategy.REST_API }),
    testConnection: async () => ({ providerCode, status: 'HEALTHY', checkedAt: new Date(), strategy: IntegrationStrategy.REST_API }),
    buildRequestContext: () => ({} as AdapterRequestContext),
    recordMetric: (_e: AdapterMetricEvent) => {},
    recordAuditEvent: (_e: AdapterAuditEvent) => {},
    normalizePagination: (i: AdapterPaginationInput): AdapterPaginationOutput => ({
      page: i.page, limit: i.limit, offset: (i.page - 1) * i.limit, hasMore: false,
    }),
    buildResponseMetadata: () => ({} as AdapterResponseMetadata),
    buildExternalReference: (id: string): ExternalReference => ({ providerCode, externalId: id, syncedAt: new Date() }),
    mapError: (e: unknown): AdapterError => ({ code: 'UNKNOWN', message: String(e), providerCode, retryable: false }),
  };
}

describe('SupplierAdapterFactoryIntegration', () => {
  let registry: SupplierAdapterRegistry;
  let factory: SupplierAdapterFactoryIntegration;

  beforeEach(() => {
    registry = new SupplierAdapterRegistry();
    factory = new SupplierAdapterFactoryIntegration(registry);
  });

  it('selects the only capable adapter', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]));
    const selected = factory.select({ workspaceId: 'ws1', capability: AdapterCapability.SEARCH_SUPPLIERS });
    expect(selected.adapterMetadata.providerCode).toBe('INDIAMART');
  });

  it('throws when no adapter supports the capability', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]));
    expect(() =>
      factory.select({ workspaceId: 'ws1', capability: AdapterCapability.TRACK_SHIPMENT }),
    ).toThrow(/No adapter/i);
  });

  it('prefers preferred provider code', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]));
    registry.register(makeAdapter('TRADEINDIA', [AdapterCapability.SEARCH_SUPPLIERS]));

    const selected = factory.select({
      workspaceId: 'ws1',
      capability: AdapterCapability.SEARCH_SUPPLIERS,
      preferredProviderCode: 'TRADEINDIA',
    });
    expect(selected.adapterMetadata.providerCode).toBe('TRADEINDIA');
  });

  it('filters by integration strategy', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS], [IntegrationStrategy.REST_API]));
    registry.register(makeAdapter('EMAIL_PROVIDER', [AdapterCapability.SEARCH_SUPPLIERS], [IntegrationStrategy.EMAIL_RFQ]));

    const selected = factory.select({
      workspaceId: 'ws1',
      capability: AdapterCapability.SEARCH_SUPPLIERS,
      strategy: IntegrationStrategy.EMAIL_RFQ,
    });
    expect(selected.adapterMetadata.providerCode).toBe('EMAIL_PROVIDER');
  });

  it('filters by country', () => {
    registry.register(makeAdapter('INDIA_ONLY', [AdapterCapability.SEARCH_SUPPLIERS], [IntegrationStrategy.REST_API], ['IN']));
    registry.register(makeAdapter('GLOBAL', [AdapterCapability.SEARCH_SUPPLIERS], [IntegrationStrategy.REST_API], []));

    const selected = factory.select({
      workspaceId: 'ws1',
      capability: AdapterCapability.SEARCH_SUPPLIERS,
      countryCode: 'CN',
    });
    expect(selected.adapterMetadata.providerCode).toBe('GLOBAL');
  });

  it('selectAll returns all matching adapters', () => {
    registry.register(makeAdapter('INDIAMART', [AdapterCapability.SEARCH_SUPPLIERS]));
    registry.register(makeAdapter('TRADEINDIA', [AdapterCapability.SEARCH_SUPPLIERS]));
    registry.register(makeAdapter('PO_ONLY', [AdapterCapability.SUBMIT_PURCHASE_ORDER]));

    const all = factory.selectAll({ workspaceId: 'ws1', capability: AdapterCapability.SEARCH_SUPPLIERS });
    expect(all).toHaveLength(2);
  });
});
