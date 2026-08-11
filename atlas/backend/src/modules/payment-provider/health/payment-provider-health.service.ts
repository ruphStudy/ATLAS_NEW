import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import { PaymentProviderRepository } from '../payment-provider.repository';
import { PaymentCredentialDecryptor } from '../credentials/payment-credential.decryptor';
import { PaymentProviderEventQueue } from '../jobs';
import { CONSECUTIVE_FAILURES_FOR_DEGRADED, CONSECUTIVE_FAILURES_FOR_UNHEALTHY } from '../constants';
import { IPaymentHealthResult, IPaymentProviderAccount, PaymentConnectionStatus, PaymentHealthState, PaymentProviderEvent } from '../interfaces';

/**
 * PaymentProviderHealthService — mirrors `MarketplaceHealthMonitorService`:
 * goes straight through the registry to the adapter's own `healthCheck()`,
 * never touches raw credentials itself (only passes the decrypted bag
 * through), and only persists/publishes when the health STATE actually
 * changes (not on every single check).
 */
@Injectable()
export class PaymentProviderHealthService {
  private readonly logger = new Logger(PaymentProviderHealthService.name);

  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly repository: PaymentProviderRepository,
    private readonly decryptor: PaymentCredentialDecryptor,
    private readonly eventQueue: PaymentProviderEventQueue,
  ) {}

  async checkAccount(account: IPaymentProviderAccount): Promise<IPaymentHealthResult> {
    const adapter = this.registry.get(account.providerKey);
    if (!adapter) {
      return {
        providerKey: account.providerKey,
        accountId: account.id,
        state: PaymentHealthState.OFFLINE,
        connectionStatus: PaymentConnectionStatus.UNKNOWN,
        errorMessage: `No adapter registered for '${account.providerKey}'`,
        checkedAt: new Date(),
      };
    }

    const credential = await this.repository.findCredentialByAccountId(account.id);
    if (!credential) {
      return {
        providerKey: account.providerKey,
        accountId: account.id,
        state: PaymentHealthState.OFFLINE,
        connectionStatus: PaymentConnectionStatus.UNKNOWN,
        errorMessage: 'No credentials configured',
        checkedAt: new Date(),
      };
    }

    const decrypted = this.decryptor.decryptCredential(credential);
    const result = await adapter.healthCheck(decrypted.fields);
    result.accountId = account.id;

    await this.applyResult(account, result);
    return result;
  }

  async checkAll(workspaceId: string): Promise<IPaymentHealthResult[]> {
    const accounts = await this.repository.findAccounts(workspaceId);
    const results: IPaymentHealthResult[] = [];
    for (const account of accounts) {
      results.push(await this.checkAccount(account));
    }
    return results;
  }

  private async applyResult(account: IPaymentProviderAccount, result: IPaymentHealthResult): Promise<void> {
    const isHealthy = result.connectionStatus === PaymentConnectionStatus.CONNECTED;
    const consecutiveFailures = isHealthy ? 0 : account.consecutiveFailures + 1;

    let toState = PaymentHealthState.HEALTHY;
    if (!isHealthy) {
      toState = consecutiveFailures >= CONSECUTIVE_FAILURES_FOR_UNHEALTHY ? PaymentHealthState.UNHEALTHY : PaymentHealthState.DEGRADED;
    } else if (account.consecutiveFailures >= CONSECUTIVE_FAILURES_FOR_DEGRADED) {
      toState = PaymentHealthState.HEALTHY;
    }

    await this.repository.updateAccount(account.id, { healthState: toState, consecutiveFailures });
    await this.repository.createHealthHistory({
      accountId: account.id,
      workspaceId: account.workspaceId,
      fromState: account.healthState,
      toState,
      connectionStatus: result.connectionStatus,
      responseTimeMs: result.responseTimeMs ?? null,
      errorMessage: result.errorMessage ?? null,
    });

    if (toState !== account.healthState) {
      await this.eventQueue.publish({
        event: PaymentProviderEvent.HEALTH_STATE_CHANGED,
        workspaceId: account.workspaceId,
        providerKey: account.providerKey,
        accountId: account.id,
        metadata: { fromState: account.healthState, toState },
      });
    }
  }
}
