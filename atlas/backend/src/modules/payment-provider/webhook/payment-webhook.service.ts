import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderRegistry } from '../registry/payment-provider.registry';
import { PaymentProviderRepository } from '../payment-provider.repository';
import { PaymentCredentialDecryptor } from '../credentials/payment-credential.decryptor';
import { PaymentProviderEventQueue } from '../jobs';
import { PaymentProviderEvent, PaymentTransactionStatus, PaymentWebhookStatus } from '../interfaces';
import { PaymentProviderNotRegisteredException, PaymentWebhookSignatureInvalidException } from '../exceptions/payment-provider.exceptions';

const RAW_STATUS_TO_TRANSACTION_STATUS: Record<string, PaymentTransactionStatus> = {
  succeeded: PaymentTransactionStatus.SUCCEEDED,
  captured: PaymentTransactionStatus.CAPTURED,
  paid: PaymentTransactionStatus.SUCCEEDED,
  authorized: PaymentTransactionStatus.AUTHORIZED,
  failed: PaymentTransactionStatus.FAILED,
  refunded: PaymentTransactionStatus.REFUNDED,
  cancelled: PaymentTransactionStatus.CANCELLED,
  canceled: PaymentTransactionStatus.CANCELLED,
};

/**
 * PaymentWebhookService — the generic inbound-webhook pipeline: resolve
 * adapter → find which of this provider's accounts the signature matches
 * (each account has its own webhook secret) → normalize the payload →
 * dedupe on `(providerKey, externalEventId)` → persist → best-effort sync
 * the referenced transaction's status → publish lifecycle events. Mirrors
 * `WebhookHandler.handleIncoming()`'s shape without a dedicated
 * `WebhookConfig` table (out of scope here) — account-level webhook
 * secrets are tried directly instead.
 */
@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly repository: PaymentProviderRepository,
    private readonly decryptor: PaymentCredentialDecryptor,
    private readonly eventQueue: PaymentProviderEventQueue,
  ) {}

  async handleIncoming(providerKey: string, headers: Record<string, string>, rawBody: string): Promise<{ received: boolean; eventId?: string }> {
    const adapter = this.registry.get(providerKey);
    if (!adapter) {
      throw new PaymentProviderNotRegisteredException(providerKey);
    }

    const accounts = await this.repository.findActiveAccountsByProviderKey(providerKey);
    let matchedAccountId: string | null = null;
    let matchedWorkspaceId: string | null = null;

    for (const account of accounts) {
      const credential = await this.repository.findCredentialByAccountId(account.id);
      const webhookSecret = credential ? this.decryptor.decryptCredential(credential).fields.webhookSecret : undefined;
      if (webhookSecret && adapter.verifyWebhookSignature(headers, rawBody, webhookSecret)) {
        matchedAccountId = account.id;
        matchedWorkspaceId = account.workspaceId;
        break;
      }
    }

    const normalized = adapter.normalizeWebhookPayload(headers, rawBody);

    if (!matchedAccountId) {
      await this.repository.createWebhookEvent({
        providerKey,
        externalEventId: normalized.externalEventId || `unverified:${Date.now()}`,
        eventType: normalized.eventType,
        status: PaymentWebhookStatus.FAILED,
        signatureValid: false,
        payload: normalized.payload as any,
        failureReason: 'Signature did not match any configured account for this provider',
      });
      throw new PaymentWebhookSignatureInvalidException();
    }

    const existing = await this.repository.findWebhookEvent(providerKey, normalized.externalEventId);
    if (existing) {
      return { received: true, eventId: existing.id };
    }

    const webhookEvent = await this.repository.createWebhookEvent({
      workspaceId: matchedWorkspaceId,
      accountId: matchedAccountId,
      providerKey,
      externalEventId: normalized.externalEventId,
      eventType: normalized.eventType,
      status: PaymentWebhookStatus.PROCESSING,
      signatureValid: true,
      payload: normalized.payload as any,
    });

    await this.eventQueue.publish({
      event: PaymentProviderEvent.WEBHOOK_RECEIVED,
      workspaceId: matchedWorkspaceId as string,
      providerKey,
      accountId: matchedAccountId,
      metadata: { eventType: normalized.eventType },
    });

    try {
      await this.syncTransactionFromWebhook(normalized.externalTransactionId, normalized.payload, matchedWorkspaceId as string, providerKey, matchedAccountId);
      await this.repository.updateWebhookEvent(webhookEvent.id, { status: PaymentWebhookStatus.SUCCESS, processedAt: new Date() });
    } catch (error) {
      this.logger.warn(`Failed to sync transaction from webhook '${webhookEvent.id}': ${(error as Error).message}`);
      await this.repository.updateWebhookEvent(webhookEvent.id, {
        status: PaymentWebhookStatus.FAILED,
        failureReason: (error as Error).message,
        processedAt: new Date(),
      });
    }

    await this.eventQueue.publish({
      event: PaymentProviderEvent.WEBHOOK_PROCESSED,
      workspaceId: matchedWorkspaceId as string,
      providerKey,
      accountId: matchedAccountId,
      metadata: { eventType: normalized.eventType },
    });

    return { received: true, eventId: webhookEvent.id };
  }

  private async syncTransactionFromWebhook(
    externalTransactionId: string | undefined,
    payload: Record<string, unknown>,
    workspaceId: string,
    providerKey: string,
    accountId: string,
  ): Promise<void> {
    if (!externalTransactionId) return;

    const transaction = await this.repository.findTransactionByExternalId(externalTransactionId);
    if (!transaction) return;

    const rawStatus = String(payload.status ?? '').toLowerCase();
    const mappedStatus = RAW_STATUS_TO_TRANSACTION_STATUS[rawStatus];
    if (!mappedStatus || mappedStatus === transaction.status) return;

    await this.repository.updateTransaction(transaction.id, { status: mappedStatus });

    const event =
      mappedStatus === PaymentTransactionStatus.SUCCEEDED || mappedStatus === PaymentTransactionStatus.CAPTURED
        ? PaymentProviderEvent.TRANSACTION_SUCCEEDED
        : mappedStatus === PaymentTransactionStatus.FAILED
          ? PaymentProviderEvent.TRANSACTION_FAILED
          : mappedStatus === PaymentTransactionStatus.REFUNDED
            ? PaymentProviderEvent.TRANSACTION_REFUNDED
            : undefined;

    if (event) {
      await this.eventQueue.publish({ event, workspaceId, providerKey, accountId, transactionId: transaction.id });
    }
  }
}
