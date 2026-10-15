import { MarketplaceProviderRegistry } from '../../../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceCapability } from '../../../../marketplace-provider/interfaces';
import { MarketplaceProviderFactoryValidator } from '../../../../marketplace-provider-factory/validator/marketplace-provider-factory.validator';
import { MarketplaceProviderDependencyResolver } from '../../../../marketplace-provider-factory/resolver/marketplace-provider-dependency.resolver';
import { MarketplaceProviderFactoryErrorNormalizer, ProviderFactoryException } from '../../../../marketplace-provider-factory/errors/marketplace-provider-factory.error-normalizer';
import { MarketplaceProviderFactoryMetrics } from '../../../../marketplace-provider-factory/metrics/marketplace-provider-factory.metrics';
import { MP_FACTORY_ERROR_CODES } from '../../../../marketplace-provider-factory/constants';
import { AmazonMarketplaceProviderAdapter } from '../amazon-marketplace-provider.adapter';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AmazonMarketplace, AmazonRegion } from '../interfaces/amazon.interfaces';
import { ConfigurationService } from '@config/configuration.service';

function makeConfigurationServiceStub(overrides: Partial<{ clientId: string; clientSecret: string; environment: string }> = {}): ConfigurationService {
  return {
    getAmazonProviderConfig: () => ({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox',
      ...overrides,
    }),
  } as unknown as ConfigurationService;
}

/**
 * Verifies the registration bridge added in this change: the real Amazon
 * infrastructure (via AmazonMarketplaceProviderAdapter) is discoverable
 * through MarketplaceProviderRegistry, the entry point
 * MarketplaceProviderFactoryService.resolve() depends on.
 *
 * No DB access: MarketplaceProviderConfigManager / MarketplaceProviderCredentialsManager
 * are mocked to simulate "no credential configured yet", matching the real
 * state of this environment (confirmed in a prior investigation).
 */
describe('Amazon -> MarketplaceProviderRegistry bridge', () => {
  let registry: MarketplaceProviderRegistry;
  let adapter: AmazonMarketplaceProviderAdapter;

  beforeEach(() => {
    registry = new MarketplaceProviderRegistry();
    adapter = new AmazonMarketplaceProviderAdapter({} as AmazonSpApiClient, makeConfigurationServiceStub());
    registry.register(adapter);
  });

  it('registers AMAZON so it is discoverable by key', () => {
    expect(registry.isRegistered('AMAZON')).toBe(true);
    expect(registry.get('AMAZON')).toBe(adapter);
  });

  it('declares GET_CATALOG capability (what discovery would need)', () => {
    expect(adapter.supportsCapability(MarketplaceCapability.GET_CATALOG)).toBe(true);
  });

  it('passes MarketplaceProviderFactoryValidator for a GET_CATALOG request', () => {
    const validator = new MarketplaceProviderFactoryValidator(registry);
    const result = validator.validate({
      workspaceId: 'ws-1',
      providerKey: 'AMAZON',
      capability: MarketplaceCapability.GET_CATALOG,
      country: 'US',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('resolve() reaches the adapter layer and stops at CREDENTIALS_MISSING (expected, since no credential is configured yet)', async () => {
    const configManager = { resolve: jest.fn().mockResolvedValue(null) } as any;
    const credentialsManager = { resolve: jest.fn().mockResolvedValue(null) } as any;
    const errorNormalizer = new MarketplaceProviderFactoryErrorNormalizer();
    const metrics = new MarketplaceProviderFactoryMetrics();

    const dependencyResolver = new MarketplaceProviderDependencyResolver(
      registry,
      configManager,
      credentialsManager,
      errorNormalizer,
      metrics,
    );

    await expect(
      dependencyResolver.resolve('AMAZON', {
        workspaceId: 'ws-1',
        providerKey: 'AMAZON',
        capability: MarketplaceCapability.GET_CATALOG,
      }),
    ).rejects.toMatchObject({
      code: MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING,
    } as Partial<ProviderFactoryException>);

    // Proves resolution got PAST "provider not found" and into credential resolution -
    // i.e. it reached the real adapter layer via the registry.
    expect(credentialsManager.resolve).toHaveBeenCalledWith('AMAZON', 'ws-1', undefined, undefined);
  });

  it('a non-registered provider key still fails fast with PROVIDER_NOT_FOUND (control case)', async () => {
    const configManager = { resolve: jest.fn() } as any;
    const credentialsManager = { resolve: jest.fn() } as any;
    const errorNormalizer = new MarketplaceProviderFactoryErrorNormalizer();
    const metrics = new MarketplaceProviderFactoryMetrics();

    const dependencyResolver = new MarketplaceProviderDependencyResolver(
      registry,
      configManager,
      credentialsManager,
      errorNormalizer,
      metrics,
    );

    await expect(
      dependencyResolver.resolve('NOT_A_PROVIDER', { workspaceId: 'ws-1' } as any),
    ).rejects.toMatchObject({ code: MP_FACTORY_ERROR_CODES.PROVIDER_NOT_FOUND });
    expect(credentialsManager.resolve).not.toHaveBeenCalled();
  });
});

describe('AmazonMarketplaceProviderAdapter.testConnection marketplace selection', () => {
  const credentials = {
    workspaceId: 'ws-1',
    providerKey: 'AMAZON',
    credentialType: 'OAUTH_TOKEN' as any,
    encryptionAlgorithm: 'NONE' as any,
    fields: { refreshToken: 'seller-refresh-token' },
  };
  const context = (country?: string) => ({
    correlationId: 'c',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON',
    accountId: 'acct-1',
    marketplaceKey: 'CUSTOM' as any,
    ...(country ? { country } : {}),
  });

  function makeAdapter() {
    const get = jest.fn().mockResolvedValue({ status: 200, data: {} });
    const adapter = new AmazonMarketplaceProviderAdapter({ get } as unknown as AmazonSpApiClient, makeConfigurationServiceStub());
    return { adapter, get };
  }

  it('an India account (country=IN) is tested against the India marketplace / EU region, not US', async () => {
    const { adapter, get } = makeAdapter();

    await adapter.testConnection(context('IN'), credentials);

    expect(get.mock.calls[0][0]).toMatchObject({ marketplace: AmazonMarketplace.IN, region: AmazonRegion.EU });
  });

  it('a US account is tested against the US marketplace / NA region', async () => {
    const { adapter, get } = makeAdapter();

    await adapter.testConnection(context('US'), credentials);

    expect(get.mock.calls[0][0]).toMatchObject({ marketplace: AmazonMarketplace.US, region: AmazonRegion.NA });
  });

  it('keeps the existing US default when no country is supplied', async () => {
    const { adapter, get } = makeAdapter();

    await adapter.testConnection(context(), credentials);

    expect(get.mock.calls[0][0]).toMatchObject({ marketplace: AmazonMarketplace.US });
  });
});
