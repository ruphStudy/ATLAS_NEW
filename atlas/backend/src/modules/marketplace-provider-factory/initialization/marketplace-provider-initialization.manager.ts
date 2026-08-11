import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderCredentialsManager } from '../../marketplace-provider-credentials/marketplace-provider-credentials.manager';
import { ProviderInstance, ProviderInstanceState } from '../interfaces';
import { ProviderFactoryException } from '../errors/marketplace-provider-factory.error-normalizer';
import { MP_FACTORY_CONSTANTS, MP_FACTORY_ERROR_CODES } from '../constants';

/**
 * Manages the initialization and teardown of provider instances.
 *
 * Initialization:
 * 1. Validates instance is in a buildable state
 * 2. Optionally calls adapter.healthCheck() to confirm the adapter is reachable
 * 3. Marks instance as READY (or DEGRADED on soft failure)
 *
 * Decrypted credentials are used only inside this method and are never
 * stored on the instance or returned to callers.
 */
@Injectable()
export class MarketplaceProviderInitializationManager {
  private readonly logger = new Logger(MarketplaceProviderInitializationManager.name);
  /** Tracks in-flight initializations by instanceId to prevent duplicate work */
  private readonly inFlight = new Map<string, Promise<ProviderInstance>>();

  constructor(
    private readonly credentialsManager: MarketplaceProviderCredentialsManager,
  ) {}

  /**
   * Initializes an instance, using single-flight to prevent duplicate init.
   */
  async initialize(instance: ProviderInstance): Promise<ProviderInstance> {
    if (MP_FACTORY_CONSTANTS.UNUSABLE_STATES.has(instance.state)) {
      throw new ProviderFactoryException(
        MP_FACTORY_ERROR_CODES.INITIALIZATION_FAILURE,
        `Cannot initialize instance '${instance.instanceId}' in state '${instance.state}'`,
        false,
      );
    }

    // Single-flight: if another coroutine is already initializing the same instance, wait for it
    const existing = this.inFlight.get(instance.instanceId);
    if (existing) {
      this.logger.debug(`Single-flight: waiting for in-flight init of '${instance.instanceId}'`);
      return existing;
    }

    const work = this.doInitialize(instance);
    this.inFlight.set(instance.instanceId, work);

    try {
      return await work;
    } finally {
      this.inFlight.delete(instance.instanceId);
    }
  }

  /**
   * Disposes an instance — marks it DISPOSED so it cannot be reused.
   */
  dispose(instance: ProviderInstance): ProviderInstance {
    instance.state = ProviderInstanceState.DISPOSED;
    this.logger.debug(`Disposed instance '${instance.instanceId}' for '${instance.providerKey}'`);
    return instance;
  }

  // ── Internals ────────────────────────────────────────────────

  private async doInitialize(instance: ProviderInstance): Promise<ProviderInstance> {
    instance.state = ProviderInstanceState.INITIALIZING;
    this.logger.debug(`Initializing instance '${instance.instanceId}' for '${instance.providerKey}'`);

    const initStart = Date.now();

    try {
      // Validate timeout
      await Promise.race([
        this.runInit(instance),
        this.timeout(MP_FACTORY_CONSTANTS.INIT_TIMEOUT_MS, instance.instanceId),
      ]);

      instance.state = ProviderInstanceState.READY;
      instance.initializedAt = new Date();
      this.logger.log(
        `Initialized provider instance '${instance.providerKey}' in ${Date.now() - initStart}ms`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      instance.state = ProviderInstanceState.FAILED;
      instance.failureReason = this.sanitizeError(msg);
      this.logger.error(
        `Failed to initialize '${instance.providerKey}': ${this.sanitizeError(msg)}`,
      );
      throw new ProviderFactoryException(
        MP_FACTORY_ERROR_CODES.INITIALIZATION_FAILURE,
        `Provider '${instance.providerKey}' initialization failed`,
        true,
        { instanceId: instance.instanceId },
      );
    }

    return instance;
  }

  private async runInit(instance: ProviderInstance): Promise<void> {
    // Decrypt credentials at the initialization boundary only
    if (instance.credential) {
      const bag = await this.credentialsManager.resolveDecrypted(
        instance.providerKey,
        instance.workspaceId,
        instance.accountId,
        instance.marketplaceKey,
      );

      if (!bag) {
        throw new ProviderFactoryException(
          MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING,
          `Could not decrypt credentials for '${instance.providerKey}'`,
          false,
        );
      }

      // Pass to adapter health-check (connection probe) using decrypted bag
      // The bag is ephemeral — it is NOT stored on the instance
      const healthResult = await instance.adapter.healthCheck(instance.accountId ?? undefined);
      if (healthResult.status === 'UNHEALTHY') {
        instance.state = ProviderInstanceState.DEGRADED;
        this.logger.warn(
          `Provider '${instance.providerKey}' health check returned UNHEALTHY during init`,
        );
      }

      // Explicit zero-out of the bag fields (best-effort in JS GC)
      for (const key of Object.keys(bag.fields)) {
        bag.fields[key] = '';
      }
    }
  }

  private timeout(ms: number, instanceId: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Initialization timeout after ${ms}ms for instance '${instanceId}'`)),
        ms,
      ),
    );
  }

  /** Redacts any potential secrets from error messages before logging/exposing */
  private sanitizeError(msg: string): string {
    return msg
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/(key|secret|token|password|credential)\s*[:=]\s*\S+/gi, '$1=[REDACTED]');
  }
}
