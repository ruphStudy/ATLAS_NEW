import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ResolvedProviderDependencies, ProviderInstance, ProviderInstanceState, ProviderFactoryRequest } from '../interfaces';
import { MarketplaceProviderFactoryValidator } from '../validator/marketplace-provider-factory.validator';
import { CredentialStatus } from '../../marketplace-provider-credentials/interfaces';

/**
 * Constructs a ProviderInstance value object from resolved dependencies.
 * No I/O happens here — this is purely in-memory assembly.
 */
@Injectable()
export class MarketplaceProviderInstanceBuilder {
  private readonly logger = new Logger(MarketplaceProviderInstanceBuilder.name);

  constructor(private readonly validator: MarketplaceProviderFactoryValidator) {}

  /**
   * Builds a ProviderInstance in the CREATING state.
   * Credential validation is performed but decryption does NOT happen here.
   */
  build(
    request: ProviderFactoryRequest,
    deps: ResolvedProviderDependencies,
  ): ProviderInstance {
    const { adapter, config, credential } = deps;

    // Validate credential state if present
    if (credential) {
      const check = this.validator.validateCredentialState(
        credential.status as CredentialStatus,
        credential.expiresAt,
      );
      if (!check.valid) {
        this.logger.warn(`Credential state invalid for '${adapter.metadata.providerKey}': ${check.error}`);
        // Return instance in INVALID state — caller decides how to handle
        return this.makeInstance(request, deps, ProviderInstanceState.INVALID, check.error);
      }
    }

    return this.makeInstance(request, deps, ProviderInstanceState.CREATING);
  }

  private makeInstance(
    request: ProviderFactoryRequest,
    deps: ResolvedProviderDependencies,
    state: ProviderInstanceState,
    failureReason?: string,
  ): ProviderInstance {
    const { adapter, config, credential } = deps;

    const effectiveApiVersion =
      request.apiVersion ??
      config?.payload?.apiVersion ??
      adapter.metadata.version.label ??
      `${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`;

    const ttlMs =
      config?.payload?.retryPolicy?.maxAttempts !== undefined
        ? undefined
        : undefined; // TTL managed by cache, not instance

    const expiresAt = credential?.expiresAt ?? null;

    return {
      instanceId: uuidv4(),
      workspaceId: request.workspaceId,
      providerKey: adapter.metadata.providerKey.toUpperCase(),
      accountId: request.accountId ?? null,
      marketplaceKey: request.marketplaceKey ?? null,
      country: request.country ?? null,
      region: request.region ?? null,
      apiVersion: effectiveApiVersion ?? null,
      state,
      adapter,
      config: config ?? null,
      credential: credential ?? null,
      configVersion: config?.version ?? null,
      credentialVersion: credential?.version ?? null,
      encryptionVersion: credential?.encryptionVersion ?? null,
      createdAt: new Date(),
      initializedAt: null,
      lastRefreshedAt: null,
      expiresAt,
      failureReason: failureReason ?? null,
    };
  }
}
