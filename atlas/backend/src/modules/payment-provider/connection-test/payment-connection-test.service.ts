import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import { PaymentProviderRepository } from '../payment-provider.repository';
import { PaymentCredentialDecryptor } from '../credentials/payment-credential.decryptor';
import { PaymentProviderHealthService } from '../health/payment-provider-health.service';
import { PaymentProviderEventQueue } from '../jobs';
import {
  IConnectionTestResult,
  IPaymentProviderAccount,
  PaymentConnectionStatus,
  PaymentProviderEvent,
} from '../interfaces';
import {
  PaymentProviderAccountNotFoundException,
  PaymentProviderCredentialsNotConfiguredException,
  PaymentProviderNotRegisteredException,
} from '../exceptions/payment-provider.exceptions';

/**
 * PaymentConnectionTestService — mirrors `MarketplaceConnectionTestService`:
 * resolves the adapter from the registry, delegates to
 * `adapter.testConnection()`, persists `lastTestedAt/lastTestSuccess`, and
 * syncs the health monitor so a manual test also updates the account's
 * ongoing health state rather than being a one-off, disconnected check.
 */
@Injectable()
export class PaymentConnectionTestService {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly repository: PaymentProviderRepository,
    private readonly decryptor: PaymentCredentialDecryptor,
    private readonly healthService: PaymentProviderHealthService,
    private readonly eventQueue: PaymentProviderEventQueue,
  ) {}

  async test(accountId: string, workspaceId: string): Promise<IConnectionTestResult> {
    const account = await this.repository.findAccountById(accountId);
    if (!account || account.workspaceId !== workspaceId) {
      throw new PaymentProviderAccountNotFoundException(accountId);
    }

    const adapter = this.registry.get(account.providerKey);
    if (!adapter) {
      throw new PaymentProviderNotRegisteredException(account.providerKey);
    }

    const credential = await this.repository.findCredentialByAccountId(accountId);
    if (!credential) {
      throw new PaymentProviderCredentialsNotConfiguredException(accountId);
    }

    const correlationId = randomUUID();
    const decrypted = this.decryptor.decryptCredential(credential);
    const startedAt = Date.now();

    const health = await adapter.testConnection(decrypted.fields);
    const responseTimeMs = health.responseTimeMs ?? Date.now() - startedAt;
    const success = health.connectionStatus === PaymentConnectionStatus.CONNECTED;

    await this.repository.updateAccount(accountId, {
      lastTestedAt: new Date(),
      lastTestSuccess: success,
      lastTestCorrelationId: correlationId,
    });

    // Keeps the ongoing health monitor in sync with this manual test rather than leaving it stale until the next scheduled check.
    await this.healthService.checkAccount(await this.repository.findAccountById(accountId) as IPaymentProviderAccount);

    await this.eventQueue.publish({
      event: success ? PaymentProviderEvent.CONNECTION_TEST_SUCCEEDED : PaymentProviderEvent.CONNECTION_TEST_FAILED,
      workspaceId,
      providerKey: account.providerKey,
      accountId,
      metadata: { correlationId },
    });

    return {
      correlationId,
      workspaceId,
      providerKey: account.providerKey,
      accountId,
      success,
      connectionStatus: health.connectionStatus,
      responseTimeMs,
      errorMessage: health.errorMessage,
      testedAt: new Date(),
    };
  }
}
