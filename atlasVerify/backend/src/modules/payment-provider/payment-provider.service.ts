import { Injectable, Logger } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PaymentProviderRepository } from './payment-provider.repository';
import { PaymentProviderRegistry } from './registry/payment-provider.registry';
import { PaymentProviderFactory } from './registry/payment-provider.factory';
import { PaymentCredentialEncryptor } from './credentials/payment-credential.encryptor';
import { PaymentCredentialDecryptor } from './credentials/payment-credential.decryptor';
import { PaymentProviderHealthService } from './health/payment-provider-health.service';
import { PaymentConnectionTestService } from './connection-test/payment-connection-test.service';
import { PaymentErrorNormalizer } from './errors/payment-error-normalizer';
import { PaymentProviderEventQueue } from './jobs';
import { withProviderRetry } from './retry.util';
import {
  RegisterPaymentProviderAccountDto,
  UpdatePaymentProviderAccountDto,
  ConfigurePaymentCredentialsDto,
  CreatePaymentDto,
  CapturePaymentDto,
  RefundPaymentDto,
  TransactionFilterDto,
  PaginatedPaymentTransactionResponseDto,
} from './dto';
import {
  IPaymentProviderAccount,
  IPaymentTransaction,
  IProviderResolutionOptions,
  IResolvedPaymentProvider,
  PaymentCapability,
  PaymentProviderAccountStatus,
  PaymentProviderEvent,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from './interfaces';
import { PAYMENT_PROVIDER_MANAGE_ROLES, PAYMENT_PROVIDER_MODULE, DEFAULT_ACCOUNT_PRIORITY } from './constants';
import {
  PaymentAccessDeniedException,
  PaymentDuplicateRequestException,
  PaymentProviderAccountAlreadyExistsException,
  PaymentProviderAccountInactiveException,
  PaymentProviderAccountNotFoundException,
  PaymentProviderCredentialInvalidException,
  PaymentProviderCredentialsNotConfiguredException,
  PaymentProviderNoCapableAccountException,
  PaymentProviderNotRegisteredException,
  PaymentProviderRequestFailedException,
  PaymentTransactionNotFoundException,
} from './exceptions/payment-provider.exceptions';

@Injectable()
export class PaymentProviderService {
  private readonly logger = new Logger(PaymentProviderService.name);

  constructor(
    private readonly repository: PaymentProviderRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly factory: PaymentProviderFactory,
    private readonly encryptor: PaymentCredentialEncryptor,
    private readonly decryptor: PaymentCredentialDecryptor,
    private readonly healthService: PaymentProviderHealthService,
    private readonly connectionTestService: PaymentConnectionTestService,
    private readonly errorNormalizer: PaymentErrorNormalizer,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: PaymentProviderEventQueue,
  ) {}

  // ── Accounts ─────────────────────────────────────────────────────

  async registerAccount(workspaceId: string, userId: string, userRole: string, dto: RegisterPaymentProviderAccountDto): Promise<IPaymentProviderAccount> {
    this.assertCanManage(userRole);

    const adapter = this.registry.get(dto.providerKey);
    if (!adapter) {
      throw new PaymentProviderNotRegisteredException(dto.providerKey);
    }

    const existing = await this.repository.findAccountByHandle(workspaceId, dto.providerKey, dto.accountHandle);
    if (existing) {
      throw new PaymentProviderAccountAlreadyExistsException(dto.providerKey, dto.accountHandle);
    }

    if (dto.isDefault) {
      await this.repository.clearDefaultForProvider(workspaceId, dto.providerKey);
    }

    const account = await this.repository.createAccount({
      workspaceId,
      providerKey: dto.providerKey,
      accountHandle: dto.accountHandle,
      displayName: dto.displayName ?? adapter.metadata.displayName,
      country: dto.country ?? null,
      currency: dto.currency ?? null,
      status: PaymentProviderAccountStatus.PENDING_VERIFICATION,
      priority: dto.priority ?? DEFAULT_ACCOUNT_PRIORITY,
      isDefault: dto.isDefault ?? false,
      capabilities: adapter.metadata.supportedCapabilities,
      supportedCountries: dto.supportedCountries ?? [],
      supportedCurrencies: dto.supportedCurrencies ?? [],
      createdBy: userId,
    });

    await this.recordAudit(workspaceId, userId, 'payment-provider.account.registered', AuditActionCategory.CREATE, account.id);
    await this.publishEvent(PaymentProviderEvent.ACCOUNT_REGISTERED, workspaceId, dto.providerKey, account.id, userId);
    return account;
  }

  async updateAccount(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdatePaymentProviderAccountDto): Promise<IPaymentProviderAccount> {
    this.assertCanManage(userRole);
    const account = await this.getAccountOrThrow(id, workspaceId);

    if (dto.isDefault) {
      await this.repository.clearDefaultForProvider(workspaceId, account.providerKey);
    }

    const updated = await this.repository.updateAccount(id, {
      displayName: dto.displayName ?? account.displayName,
      status: dto.status ?? account.status,
      priority: dto.priority ?? account.priority,
      isDefault: dto.isDefault ?? account.isDefault,
      supportedCountries: dto.supportedCountries ?? account.supportedCountries,
      supportedCurrencies: dto.supportedCurrencies ?? account.supportedCurrencies,
    });

    await this.recordAudit(workspaceId, userId, 'payment-provider.account.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(PaymentProviderEvent.ACCOUNT_UPDATED, workspaceId, account.providerKey, id, userId);
    return updated;
  }

  async listAccounts(workspaceId: string, providerKey?: string): Promise<IPaymentProviderAccount[]> {
    return this.repository.findAccounts(workspaceId, providerKey);
  }

  async getAccount(id: string, workspaceId: string): Promise<IPaymentProviderAccount> {
    return this.getAccountOrThrow(id, workspaceId);
  }

  // ── Credentials ──────────────────────────────────────────────────

  async configureCredentials(accountId: string, workspaceId: string, userId: string, userRole: string, dto: ConfigurePaymentCredentialsDto): Promise<void> {
    this.assertCanManage(userRole);
    const account = await this.getAccountOrThrow(accountId, workspaceId);

    const adapter = this.registry.get(account.providerKey);
    if (!adapter) {
      throw new PaymentProviderNotRegisteredException(account.providerKey);
    }

    const validation = await adapter.validateCredentials(dto.fields);
    if (!validation.valid) {
      throw new PaymentProviderCredentialInvalidException(validation.message ?? 'credential validation failed');
    }

    const encryptedFields = this.encryptor.encryptFields(dto.fields, workspaceId, account.providerKey);

    await this.repository.upsertCredential(accountId, {
      workspaceId,
      providerKey: account.providerKey,
      encryptedFields: encryptedFields as any,
      lastValidatedAt: new Date(),
    });

    if (account.status === PaymentProviderAccountStatus.PENDING_VERIFICATION) {
      await this.repository.updateAccount(accountId, { status: PaymentProviderAccountStatus.ACTIVE });
    }

    await this.recordAudit(workspaceId, userId, 'payment-provider.credentials.configured', AuditActionCategory.CONFIGURATION, accountId);
    await this.publishEvent(PaymentProviderEvent.CREDENTIALS_CONFIGURED, workspaceId, account.providerKey, accountId, userId);
  }

  // ── Health / connection test ─────────────────────────────────────

  async testConnection(accountId: string, workspaceId: string, userId: string, userRole: string) {
    this.assertCanManage(userRole);
    return this.connectionTestService.test(accountId, workspaceId);
  }

  async checkAllHealth(workspaceId: string) {
    return this.healthService.checkAll(workspaceId);
  }

  // ── Payments ─────────────────────────────────────────────────────

  async createPayment(workspaceId: string, userId: string, dto: CreatePaymentDto): Promise<IPaymentTransaction> {
    const existing = await this.repository.findTransactionByIdempotencyKey(workspaceId, dto.idempotencyKey);
    if (existing) {
      return existing;
    }

    const resolved = await this.resolveProvider({
      workspaceId,
      capability: PaymentCapability.PAYMENT,
      country: dto.country,
      currency: dto.currency,
      preferredAccountId: dto.accountId,
    });

    const credential = await this.repository.findCredentialByAccountId(resolved.account.id);
    if (!credential) {
      throw new PaymentProviderCredentialsNotConfiguredException(resolved.account.id);
    }
    const decrypted = this.decryptor.decryptCredential(credential);

    let transaction = await this.repository.createTransaction({
      workspaceId,
      accountId: resolved.account.id,
      providerKey: resolved.account.providerKey,
      invoiceId: dto.invoiceId ?? null,
      billingPeriodId: dto.billingPeriodId ?? null,
      subscriptionId: dto.subscriptionId ?? null,
      type: dto.capture === false ? PaymentTransactionType.AUTHORIZATION : PaymentTransactionType.PAYMENT,
      status: PaymentTransactionStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      idempotencyKey: dto.idempotencyKey,
      requestedBy: userId,
      metadata: dto.metadata ?? {},
    });

    try {
      const result = await withProviderRetry(
        () =>
          resolved.adapter.createPayment(
            {
              amount: dto.amount,
              currency: dto.currency,
              idempotencyKey: dto.idempotencyKey,
              customer: dto.customer,
              paymentMethod: dto.paymentMethod,
              description: dto.description,
              metadata: dto.metadata,
              capture: dto.capture,
            },
            decrypted.fields,
          ),
        (error) => this.errorNormalizer.isRetryable(error, resolved.account.providerKey),
      );

      transaction = await this.repository.updateTransaction(transaction.id, {
        externalTransactionId: result.externalTransactionId,
        status: result.status,
        capturedAmount: result.capturedAmount ?? null,
        externalReference: result.raw as any,
      });

      await this.recordAudit(workspaceId, userId, 'payment-provider.transaction.created', AuditActionCategory.CREATE, transaction.id);
      await this.publishEvent(PaymentProviderEvent.TRANSACTION_CREATED, workspaceId, resolved.account.providerKey, resolved.account.id, userId, transaction.id);

      if ([PaymentTransactionStatus.SUCCEEDED, PaymentTransactionStatus.CAPTURED, PaymentTransactionStatus.AUTHORIZED].includes(result.status)) {
        await this.publishEvent(PaymentProviderEvent.TRANSACTION_SUCCEEDED, workspaceId, resolved.account.providerKey, resolved.account.id, userId, transaction.id);
      }

      return transaction;
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(error, resolved.account.providerKey);
      await this.repository.updateTransaction(transaction.id, {
        status: PaymentTransactionStatus.FAILED,
        errorCode: normalized.code,
        errorMessage: normalized.message,
        retryable: normalized.retryable,
      });
      await this.publishEvent(PaymentProviderEvent.TRANSACTION_FAILED, workspaceId, resolved.account.providerKey, resolved.account.id, userId, transaction.id);
      throw new PaymentProviderRequestFailedException(resolved.account.providerKey, normalized.message);
    }
  }

  async capturePayment(transactionId: string, workspaceId: string, userId: string, userRole: string, dto: CapturePaymentDto): Promise<IPaymentTransaction> {
    this.assertCanManage(userRole);
    const { transaction, account, adapter, credentials } = await this.loadTransactionContext(transactionId, workspaceId);

    const result = await this.callAdapterSafely(
      () => adapter.capturePayment(transaction.externalTransactionId as string, dto.amount, credentials),
      account.providerKey,
    );

    const updated = await this.repository.updateTransaction(transaction.id, {
      status: result.status,
      capturedAmount: result.capturedAmount ?? dto.amount ?? transaction.amount,
      externalReference: result.raw as any,
    });

    await this.recordAudit(workspaceId, userId, 'payment-provider.transaction.captured', AuditActionCategory.UPDATE, transactionId);
    return updated;
  }

  async cancelPayment(transactionId: string, workspaceId: string, userId: string, userRole: string): Promise<IPaymentTransaction> {
    this.assertCanManage(userRole);
    const { transaction, account, adapter, credentials } = await this.loadTransactionContext(transactionId, workspaceId);

    const result = await this.callAdapterSafely(() => adapter.cancelPayment(transaction.externalTransactionId as string, credentials), account.providerKey);

    const updated = await this.repository.updateTransaction(transaction.id, { status: result.status });
    await this.recordAudit(workspaceId, userId, 'payment-provider.transaction.cancelled', AuditActionCategory.UPDATE, transactionId);
    return updated;
  }

  async refundPayment(transactionId: string, workspaceId: string, userId: string, userRole: string, dto: RefundPaymentDto): Promise<IPaymentTransaction> {
    this.assertCanManage(userRole);
    const { transaction, account, adapter, credentials } = await this.loadTransactionContext(transactionId, workspaceId);

    const existingRefund = await this.repository.findTransactionByIdempotencyKey(workspaceId, dto.idempotencyKey);
    if (existingRefund) {
      throw new PaymentDuplicateRequestException(dto.idempotencyKey);
    }

    const result = await this.callAdapterSafely(
      () =>
        adapter.refundPayment(
          { externalTransactionId: transaction.externalTransactionId as string, amount: dto.amount, reason: dto.reason, idempotencyKey: dto.idempotencyKey },
          credentials,
        ),
      account.providerKey,
    );

    const refundedAmount = Math.round((transaction.refundedAmount + (result.refundedAmount ?? dto.amount ?? transaction.amount)) * 100) / 100;
    const newStatus = refundedAmount >= transaction.amount ? PaymentTransactionStatus.REFUNDED : PaymentTransactionStatus.PARTIALLY_REFUNDED;

    await this.repository.updateTransaction(transaction.id, { status: newStatus, refundedAmount });

    const refundTransaction = await this.repository.createTransaction({
      workspaceId,
      accountId: account.id,
      providerKey: account.providerKey,
      invoiceId: transaction.invoiceId,
      type: PaymentTransactionType.REFUND,
      status: PaymentTransactionStatus.REFUNDED,
      amount: result.refundedAmount ?? dto.amount ?? transaction.amount,
      currency: transaction.currency,
      idempotencyKey: dto.idempotencyKey,
      parentTransactionId: transaction.id,
      requestedBy: userId,
      externalReference: result.raw as any,
    });

    await this.recordAudit(workspaceId, userId, 'payment-provider.transaction.refunded', AuditActionCategory.UPDATE, transactionId);
    await this.publishEvent(PaymentProviderEvent.TRANSACTION_REFUNDED, workspaceId, account.providerKey, account.id, userId, transaction.id);
    return refundTransaction;
  }

  async getPaymentStatus(transactionId: string, workspaceId: string): Promise<IPaymentTransaction> {
    const { transaction, account, adapter, credentials } = await this.loadTransactionContext(transactionId, workspaceId);
    if (!transaction.externalTransactionId) {
      return transaction;
    }

    const result = await this.callAdapterSafely(() => adapter.getPaymentStatus(transaction.externalTransactionId as string, credentials), account.providerKey);
    return this.repository.updateTransaction(transaction.id, { status: result.status, externalReference: result.raw as any });
  }

  async getTransaction(id: string, workspaceId: string): Promise<IPaymentTransaction> {
    const transaction = await this.repository.findTransactionById(id);
    if (!transaction || transaction.workspaceId !== workspaceId) {
      throw new PaymentTransactionNotFoundException(id);
    }
    return transaction;
  }

  async findAllTransactions(workspaceId: string, filter: TransactionFilterDto): Promise<PaginatedPaymentTransactionResponseDto> {
    const [data, total] = await this.repository.findTransactions(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Resolution ───────────────────────────────────────────────────

  async resolveProvider(options: IProviderResolutionOptions): Promise<IResolvedPaymentProvider> {
    const accounts = await this.repository.findAccounts(options.workspaceId);
    const resolved = this.factory.select(options, accounts);
    if (!resolved) {
      throw new PaymentProviderNoCapableAccountException(options.capability);
    }
    return resolved;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async loadTransactionContext(transactionId: string, workspaceId: string) {
    const transaction = await this.repository.findTransactionById(transactionId);
    if (!transaction || transaction.workspaceId !== workspaceId) {
      throw new PaymentTransactionNotFoundException(transactionId);
    }

    const account = await this.getAccountOrThrow(transaction.accountId, workspaceId);
    if (account.status !== PaymentProviderAccountStatus.ACTIVE) {
      throw new PaymentProviderAccountInactiveException(account.id);
    }

    const adapter = this.registry.get(account.providerKey);
    if (!adapter) {
      throw new PaymentProviderNotRegisteredException(account.providerKey);
    }

    const credential = await this.repository.findCredentialByAccountId(account.id);
    if (!credential) {
      throw new PaymentProviderCredentialsNotConfiguredException(account.id);
    }

    const credentials = this.decryptor.decryptCredential(credential).fields;
    return { transaction, account, adapter, credentials };
  }

  private async callAdapterSafely<T>(fn: () => Promise<T>, providerKey: string): Promise<T> {
    try {
      return await withProviderRetry(fn, (error) => this.errorNormalizer.isRetryable(error, providerKey));
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(error, providerKey);
      throw new PaymentProviderRequestFailedException(providerKey, normalized.message);
    }
  }

  private assertCanManage(userRole: string): void {
    if (!PAYMENT_PROVIDER_MANAGE_ROLES.includes(userRole)) {
      throw new PaymentAccessDeniedException();
    }
  }

  private async getAccountOrThrow(id: string, workspaceId: string): Promise<IPaymentProviderAccount> {
    const account = await this.repository.findAccountById(id);
    if (!account || account.workspaceId !== workspaceId) {
      throw new PaymentProviderAccountNotFoundException(id);
    }
    return account;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: PAYMENT_PROVIDER_MODULE,
      entityType: 'PaymentProvider',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: PaymentProviderEvent,
    workspaceId: string,
    providerKey: string,
    accountId: string,
    actorId: string,
    transactionId?: string,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, providerKey, accountId, transactionId, actorId });
  }
}
