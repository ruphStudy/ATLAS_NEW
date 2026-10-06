import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderCredentialsService } from './marketplace-provider-credentials.service';
import { MarketplaceCredentialDecryptor } from './decryptor/marketplace-credential.decryptor';
import { DecryptedCredentialBag, IMarketplaceProviderCredential, ProviderCredentialSchema } from './interfaces';

/**
 * MarketplaceProviderCredentialsManager
 *
 * Facade used by other modules (MarketplaceProviderManager, adapters, etc.)
 * to resolve and decrypt credentials without knowing the internals of
 * storage, encryption, or caching.
 *
 * All callers receive an encrypted credential record.
 * Decryption happens only in-flight when explicitly requested.
 */
@Injectable()
export class MarketplaceProviderCredentialsManager {
  private readonly logger = new Logger(MarketplaceProviderCredentialsManager.name);

  constructor(
    private readonly service: MarketplaceProviderCredentialsService,
    private readonly decryptor: MarketplaceCredentialDecryptor,
  ) {}

  /**
   * Resolves the active credential record for a provider.
   * Returns null if none is found — caller applies adapter defaults.
   */
  async resolve(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<IMarketplaceProviderCredential | null> {
    const credential = await this.service.resolveActive(
      providerKey,
      workspaceId,
      accountId,
      marketplaceKey,
    );

    if (!credential) {
      this.logger.debug(`No active credential found for '${providerKey}' ws='${workspaceId}'`);
      return null;
    }

    return credential;
  }

  /**
   * Resolves and decrypts a credential.
   * Returns null if no active credential exists.
   *
   * SECURITY: The returned bag contains plain-text secrets.
   * Callers must NOT log, cache, or persist the bag.
   */
  async resolveDecrypted(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<DecryptedCredentialBag | null> {
    const credential = await this.resolve(providerKey, workspaceId, accountId, marketplaceKey);
    if (!credential) return null;

    return this.decryptor.decryptCredential(credential);
  }

  /**
   * Validates the active credential for a provider against its schema.
   */
  async validateActive(
    providerKey: string,
    workspaceId: string,
    schema?: ProviderCredentialSchema | null,
    accountId?: string | null,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const credential = await this.resolve(providerKey, workspaceId, accountId);
    if (!credential) {
      return { valid: false, errors: [`No active credential found for '${providerKey}'`], warnings: [] };
    }

    return this.service.validateById(credential.id, workspaceId, schema);
  }

  /**
   * Invalidates the cache for a provider or workspace.
   */
  invalidate(providerKey?: string, workspaceId?: string): void {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
