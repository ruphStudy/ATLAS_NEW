/**
 * Marketplace Provider Foundation – Integration Tests
 * Mocked adapters only. No live marketplace API calls.
 */
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import { MarketplaceProviderFactory } from '../registry/marketplace-provider.factory';
import { MarketplaceProviderResolver } from '../registry/marketplace-provider.resolver';
import { MarketplaceHealthMonitor } from '../health/marketplace-health.monitor';
import { MarketplaceErrorNormalizer } from '../errors/marketplace-error-normalizer';
import { MarketplaceCapabilityValidator } from '../capability/marketplace-capability.validator';
import { MarketplaceCredentialService } from '../credentials/marketplace-credential.service';
import { MarketplaceMetricsRecorder } from '../metrics/marketplace-metrics.recorder';
import { MarketplaceVersionManager } from '../version/marketplace-version.manager';
import { MarketplaceRequestContextBuilder } from '../context/marketplace-request-context.builder';
import { MarketplaceResponseWrapper } from '../context/marketplace-response.wrapper';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceCredentialEncryption,
  MarketplaceCredentialType,
  MarketplaceCredentials,
  MarketplaceErrorCode,
  MarketplaceHealthStatus,
  MarketplaceKey,
  WorkspaceMarketplaceProviderConfig,
} from '../interfaces';

// ── Mock Adapters ────────────────────────────────────────────

function makeFullAdapter(
  providerKey: string,
  marketplaces: MarketplaceKey[] = [MarketplaceKey.AMAZON],
  countries: string[] = ['US', 'GB', 'DE'],
  capabilities: MarketplaceCapability[] = [
    MarketplaceCapability.PUBLISH_LISTING,
    MarketplaceCapability.UPDATE_LISTING,
    MarketplaceCapability.SYNC_INVENTORY,
    MarketplaceCapability.SYNC_ORDERS,
    MarketplaceCapability.SYNC_PRICING,
    MarketplaceCapability.HEALTH_CHECK,
    MarketplaceCapability.TEST_CONNECTION,
  ],
): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey,
      providerName: providerKey,
      displayName: `${providerKey} (Mock)`,
      description: `Mock adapter for ${providerKey}`,
      version: { major: 2, minor: 1, patch: 0 },
      supportedCountries: countries,
      supportedRegions: ['us-east-1', 'eu-west-1', 'ap-south-1'],
      supportedCurrencies: ['USD', 'GBP', 'EUR', 'INR'],
      supportedLanguages: ['en', 'de', 'fr', 'hi'],
      supportedMarketplaces: marketplaces,
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 120,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: true,
      credentialFields: [
        { key: 'apiKey', label: 'API Key', required: true, sensitive: true, credentialType: MarketplaceCredentialType.API_KEY },
        { key: 'secretKey', label: 'Secret Key', required: true, sensitive: true, credentialType: MarketplaceCredentialType.API_KEY },
      ],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: (c) => countries.includes(c),
    supportsRegion: (r) => ['us-east-1', 'eu-west-1', 'ap-south-1'].includes(r),
    supportsMarketplace: (mk) => marketplaces.includes(mk),
    validateCredentials: jest.fn().mockResolvedValue({ valid: true, missing: [], expired: false, errors: [] }),
    testConnection: jest.fn().mockResolvedValue({
      providerKey,
      status: MarketplaceHealthStatus.HEALTHY,
      latencyMs: 42,
      connectionStatus: 'CONNECTED',
      checkedAt: new Date(),
    }),
    healthCheck: jest.fn().mockResolvedValue({
      providerKey,
      status: MarketplaceHealthStatus.HEALTHY,
      latencyMs: 42,
      failureRate: 0,
      checkedAt: new Date(),
    }),
  };
}

function makeWorkspaceConfig(
  providerKey: string,
  isEnabled = true,
  priority = 50,
  accountId = '',
): WorkspaceMarketplaceProviderConfig {
  return {
    id: `cfg-${providerKey}`,
    workspaceId: 'ws-integration',
    providerKey,
    accountId,
    isEnabled,
    priority,
    configuration: { timeoutMs: 25_000 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Setup ─────────────────────────────────────────────────────

let registry: MarketplaceProviderRegistry;
let factory: MarketplaceProviderFactory;
let resolver: MarketplaceProviderResolver;
let healthMonitor: MarketplaceHealthMonitor;
let errorNormalizer: MarketplaceErrorNormalizer;
let capabilityValidator: MarketplaceCapabilityValidator;
let credentialService: MarketplaceCredentialService;
let metricsRecorder: MarketplaceMetricsRecorder;
let versionManager: MarketplaceVersionManager;

beforeEach(() => {
  process.env['ATLAS_CREDENTIAL_KEY'] = 'integration-test-key';
  registry = new MarketplaceProviderRegistry();
  factory = new MarketplaceProviderFactory(registry);
  resolver = new MarketplaceProviderResolver(registry, factory);
  healthMonitor = new MarketplaceHealthMonitor(registry);
  errorNormalizer = new MarketplaceErrorNormalizer();
  capabilityValidator = new MarketplaceCapabilityValidator();
  credentialService = new MarketplaceCredentialService();
  metricsRecorder = new MarketplaceMetricsRecorder();
  versionManager = new MarketplaceVersionManager();
});

// ── Tests ─────────────────────────────────────────────────────

describe('Marketplace Provider Foundation – Integration', () => {

  describe('provider registration and discovery', () => {
    it('registers multiple providers and discovers them', () => {
      registry.register(makeFullAdapter('AMAZON_SP', [MarketplaceKey.AMAZON]));
      registry.register(makeFullAdapter('FLIPKART_SP', [MarketplaceKey.FLIPKART], ['IN']));
      registry.register(makeFullAdapter('SHOPIFY_SP', [MarketplaceKey.SHOPIFY], ['US', 'CA', 'GB']));

      const discovered = registry.discover();
      expect(discovered.map((a) => a.metadata.providerKey)).toEqual(
        expect.arrayContaining(['AMAZON_SP', 'FLIPKART_SP', 'SHOPIFY_SP']),
      );
    });

    it('validates all registered providers', () => {
      registry.register(makeFullAdapter('AMAZON_SP'));
      expect(registry.validate('AMAZON_SP')).toBe(true);
      expect(registry.validate('UNKNOWN')).toBe(false);
    });
  });

  describe('provider resolution with multi-criteria', () => {
    it('resolves by capability', () => {
      registry.register(makeFullAdapter('AMAZON_SP', [MarketplaceKey.AMAZON]));
      const { adapter } = resolver.resolve({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.SYNC_INVENTORY,
      });
      expect(adapter.metadata.providerKey).toBe('AMAZON_SP');
    });

    it('resolves by marketplace key', () => {
      registry.register(makeFullAdapter('AMAZON_SP', [MarketplaceKey.AMAZON]));
      registry.register(makeFullAdapter('FLIPKART_SP', [MarketplaceKey.FLIPKART], ['IN']));
      const { adapter } = resolver.resolve({
        workspaceId: 'ws1',
        marketplaceKey: MarketplaceKey.FLIPKART,
      });
      expect(adapter.metadata.providerKey).toBe('FLIPKART_SP');
    });

    it('resolves by country', () => {
      registry.register(makeFullAdapter('GLOBAL', [MarketplaceKey.AMAZON, MarketplaceKey.EBAY], ['US', 'GB']));
      registry.register(makeFullAdapter('INDIA_ONLY', [MarketplaceKey.FLIPKART, MarketplaceKey.MEESHO], ['IN']));
      const { adapter } = resolver.resolve({
        workspaceId: 'ws1',
        country: 'IN',
        capability: MarketplaceCapability.PUBLISH_LISTING,
      });
      expect(adapter.metadata.providerKey).toBe('INDIA_ONLY');
    });

    it('uses workspace priority from configs', () => {
      registry.register(makeFullAdapter('LOW_PRIO'));
      registry.register(makeFullAdapter('HIGH_PRIO'));
      const configs = [
        makeWorkspaceConfig('LOW_PRIO', true, 100),
        makeWorkspaceConfig('HIGH_PRIO', true, 1),
      ];
      const { adapter } = resolver.resolve({
        workspaceId: 'ws-integration',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        configs,
      });
      expect(adapter.metadata.providerKey).toBe('HIGH_PRIO');
    });

    it('resolveAll() returns all matching providers for failover', () => {
      registry.register(makeFullAdapter('A'));
      registry.register(makeFullAdapter('B'));
      registry.register(makeFullAdapter('C'));
      const all = resolver.resolveAll({ workspaceId: 'ws1', capability: MarketplaceCapability.SYNC_ORDERS });
      expect(all.length).toBe(3);
    });
  });

  describe('capability validation', () => {
    it('validates supported capability', () => {
      const adapter = makeFullAdapter('AMAZON_SP');
      const result = capabilityValidator.validate(adapter, MarketplaceCapability.PUBLISH_LISTING);
      expect(result.supported).toBe(true);
    });

    it('rejects unsupported capability', () => {
      const adapter = makeFullAdapter('AMAZON_SP', [MarketplaceKey.AMAZON], ['US'], [
        MarketplaceCapability.PUBLISH_LISTING,
      ]);
      const result = capabilityValidator.validate(adapter, MarketplaceCapability.SYNC_RETURNS);
      expect(result.supported).toBe(false);
    });

    it('throws on assertSupported() for unsupported', () => {
      const adapter = makeFullAdapter('P', [MarketplaceKey.AMAZON], ['US'], [
        MarketplaceCapability.PUBLISH_LISTING,
      ]);
      expect(() =>
        capabilityValidator.assertSupported(adapter, MarketplaceCapability.SYNC_RETURNS),
      ).toThrow();
    });
  });

  describe('credential management', () => {
    it('encrypts, packs, and decrypts credentials successfully', () => {
      const raw = { apiKey: 'ak-integration-test', secretKey: 'sk-secure-value' };
      const encrypted = credentialService.encryptFields(raw, 'ws-integration', 'AMAZON_SP');

      const creds: MarketplaceCredentials = {
        workspaceId: 'ws-integration',
        providerKey: 'AMAZON_SP',
        credentialType: MarketplaceCredentialType.API_KEY,
        encryptionAlgorithm: MarketplaceCredentialEncryption.AES_256_GCM,
        fields: encrypted,
      };

      const decrypted = credentialService.decryptCredentials(creds);
      expect(decrypted['apiKey']).toBe('ak-integration-test');
      expect(decrypted['secretKey']).toBe('sk-secure-value');
    });

    it('validates credentials against required fields', () => {
      const creds: MarketplaceCredentials = {
        workspaceId: 'ws1',
        providerKey: 'AMAZON_SP',
        credentialType: MarketplaceCredentialType.API_KEY,
        encryptionAlgorithm: MarketplaceCredentialEncryption.NONE,
        fields: { apiKey: 'my-key' },
      };
      const result = credentialService.validateCredentials(creds, ['apiKey', 'secretKey']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('secretKey');
    });

    it('masks all credentials for safe logging', () => {
      const masked = credentialService.maskForLog({ apiKey: 'real-value', secretKey: 'another' });
      expect(Object.values(masked).every((v) => v === '***MASKED***')).toBe(true);
    });

    it('workspace isolation: different workspaces cannot decrypt each other credentials', () => {
      const encrypted = credentialService.encrypt('secret', 'ws1', 'AMAZON_SP');
      expect(() => credentialService.decrypt(encrypted, 'ws2', 'AMAZON_SP')).toThrow();
    });
  });

  describe('health monitoring', () => {
    it('checks all providers and caches results', async () => {
      registry.register(makeFullAdapter('A'));
      registry.register(makeFullAdapter('B'));
      const results = await healthMonitor.checkAll();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.result.status === MarketplaceHealthStatus.HEALTHY)).toBe(true);
    });

    it('handles unhealthy provider gracefully', async () => {
      const broken = makeFullAdapter('BROKEN');
      (broken.healthCheck as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      registry.register(broken);

      const results = await healthMonitor.checkAll();
      expect(results[0]!.result.status).toBe(MarketplaceHealthStatus.UNHEALTHY);
    });

    it('isHealthy() returns optimistic true for unchecked provider', () => {
      expect(healthMonitor.isHealthy('UNCHECKED')).toBe(true);
    });
  });

  describe('error normalization', () => {
    it('normalizes errors from different providers consistently', () => {
      const r1 = errorNormalizer.normalize(new Error('Request timed out'), 'AMAZON_SP');
      const r2 = errorNormalizer.normalize(new Error('Request timed out'), 'FLIPKART_SP');
      expect(r1.code).toBe(MarketplaceErrorCode.TIMEOUT);
      expect(r2.code).toBe(MarketplaceErrorCode.TIMEOUT);
      expect(r1.retryable).toBe(r2.retryable);
    });

    it('marks retryable errors correctly', () => {
      const retryable = [new Error('timeout'), new Error('ECONNREFUSED'), new Error('rate limit'), new Error('503 service unavailable')];
      retryable.forEach((err) => {
        const result = errorNormalizer.normalize(err, 'P');
        expect(result.retryable).toBe(true);
      });
    });

    it('marks non-retryable errors correctly', () => {
      const nonRetryable = [new Error('401 unauthorized'), new Error('not found'), new Error('validation error')];
      nonRetryable.forEach((err) => {
        const result = errorNormalizer.normalize(err, 'P');
        expect(result.retryable).toBe(false);
      });
    });
  });

  describe('request context building', () => {
    it('builds context with all fields', () => {
      const ctx = MarketplaceRequestContextBuilder.create('ws1', 'AMAZON_SP', MarketplaceKey.AMAZON)
        .withUserId('user-1')
        .withAccountId('acct-1')
        .withCountry('US')
        .withCurrency('USD')
        .withRegion('us-east-1')
        .withLocale('en-US')
        .withMetadata({ source: 'integration-test' })
        .build();

      expect(ctx.correlationId).toBeDefined();
      expect(ctx.workspaceId).toBe('ws1');
      expect(ctx.providerKey).toBe('AMAZON_SP');
      expect(ctx.marketplaceKey).toBe(MarketplaceKey.AMAZON);
      expect(ctx.country).toBe('US');
      expect(ctx.region).toBe('us-east-1');
    });

    it('generates unique correlation IDs', () => {
      const ctx1 = MarketplaceRequestContextBuilder.create('ws1', 'P', MarketplaceKey.AMAZON).build();
      const ctx2 = MarketplaceRequestContextBuilder.create('ws1', 'P', MarketplaceKey.AMAZON).build();
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });
  });

  describe('response wrapping', () => {
    it('wraps successful result', () => {
      const res = MarketplaceResponseWrapper.success(
        { published: true, listingId: 'lst-1' },
        { providerKey: 'AMAZON_SP', correlationId: 'cid', requestId: 'rid', processingTimeMs: 150 },
      );
      expect(res.success).toBe(true);
      expect(res.result).toEqual({ published: true, listingId: 'lst-1' });
    });

    it('wraps error consistently across providers', () => {
      const error = errorNormalizer.normalize(new Error('rate limit'), 'AMAZON_SP');
      const res = MarketplaceResponseWrapper.fromError(error, {
        providerKey: 'AMAZON_SP', correlationId: 'cid', requestId: 'rid', processingTimeMs: 5,
      });
      expect(res.success).toBe(false);
      expect(res.errors[0]!.code).toBe(MarketplaceErrorCode.RATE_LIMITED);
    });
  });

  describe('metrics tracking', () => {
    it('accumulates request metrics', () => {
      metricsRecorder.record({ providerKey: 'AMAZON_SP', success: true, latencyMs: 100 });
      metricsRecorder.record({ providerKey: 'AMAZON_SP', success: true, latencyMs: 200 });
      metricsRecorder.record({ providerKey: 'AMAZON_SP', success: false, latencyMs: 500 });
      const m = metricsRecorder.get('AMAZON_SP')!;
      expect(m.totalRequests).toBe(3);
      expect(m.successCount).toBe(2);
      expect(m.failureCount).toBe(1);
    });
  });

  describe('version management', () => {
    it('registers and validates provider versions', () => {
      versionManager.register({
        providerKey: 'AMAZON_SP',
        current: { major: 2, minor: 0, patch: 0 },
        supported: [{ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 }],
        deprecated: [{ major: 1, minor: 0, patch: 0 }],
        minimumRequired: { major: 1, minor: 5, patch: 0 },
      });

      expect(versionManager.isDeprecated('AMAZON_SP', { major: 1, minor: 0, patch: 0 })).toBe(true);
      expect(versionManager.isSupported('AMAZON_SP', { major: 2, minor: 0, patch: 0 })).toBe(true);
      expect(versionManager.meetsMinimum('AMAZON_SP')).toBe(true);
    });
  });

  describe('workspace isolation', () => {
    it('credential encryption is workspace-scoped', () => {
      const enc1 = credentialService.encrypt('value', 'ws1', 'P');
      const enc2 = credentialService.encrypt('value', 'ws2', 'P');
      expect(enc1).not.toBe(enc2);
      expect(() => credentialService.decrypt(enc1, 'ws2', 'P')).toThrow();
    });

    it('metrics are provider+account scoped, not workspace-scoped', () => {
      metricsRecorder.record({ providerKey: 'P', accountId: 'acct-ws1', success: true, latencyMs: 100 });
      metricsRecorder.record({ providerKey: 'P', accountId: 'acct-ws2', success: false, latencyMs: 200 });
      expect(metricsRecorder.get('P', 'acct-ws1')!.successCount).toBe(1);
      expect(metricsRecorder.get('P', 'acct-ws2')!.failureCount).toBe(1);
    });
  });
});
