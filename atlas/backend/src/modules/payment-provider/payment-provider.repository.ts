import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IPaymentProviderAccount,
  IPaymentProviderCredential,
  IPaymentTransaction,
  IPaymentWebhookEvent,
  IPaymentProviderHealthHistory,
} from './interfaces';
import { TransactionFilterDto } from './dto';

@Injectable()
export class PaymentProviderRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Accounts ─────────────────────────────────────────────────────

  async createAccount(data: Partial<IPaymentProviderAccount>): Promise<IPaymentProviderAccount> {
    return this.prisma.paymentProviderAccount.create({ data: data as any }) as Promise<IPaymentProviderAccount>;
  }

  async findAccountById(id: string): Promise<IPaymentProviderAccount | null> {
    return this.prisma.paymentProviderAccount.findFirst({ where: { id, deletedAt: null } }) as Promise<IPaymentProviderAccount | null>;
  }

  async findAccountByHandle(workspaceId: string, providerKey: string, accountHandle: string): Promise<IPaymentProviderAccount | null> {
    return this.prisma.paymentProviderAccount.findFirst({
      where: { workspaceId, providerKey, accountHandle, deletedAt: null },
    }) as Promise<IPaymentProviderAccount | null>;
  }

  async findAccounts(workspaceId: string, providerKey?: string): Promise<IPaymentProviderAccount[]> {
    return this.prisma.paymentProviderAccount.findMany({
      where: { workspaceId, deletedAt: null, ...(providerKey ? { providerKey } : {}) },
      orderBy: { priority: 'asc' },
    }) as Promise<IPaymentProviderAccount[]>;
  }

  /** Every active account across all workspaces for a given provider — used by `findAccountsByProviderKey` (webhook resolution) where the workspace isn't known yet. */
  async findActiveAccountsByProviderKey(providerKey: string): Promise<IPaymentProviderAccount[]> {
    return this.prisma.paymentProviderAccount.findMany({
      where: { providerKey, status: 'ACTIVE', deletedAt: null } as any,
    }) as Promise<IPaymentProviderAccount[]>;
  }

  async updateAccount(id: string, data: Partial<IPaymentProviderAccount>): Promise<IPaymentProviderAccount> {
    return this.prisma.paymentProviderAccount.update({ where: { id }, data: data as any }) as Promise<IPaymentProviderAccount>;
  }

  async clearDefaultForProvider(workspaceId: string, providerKey: string): Promise<void> {
    await this.prisma.paymentProviderAccount.updateMany({
      where: { workspaceId, providerKey, isDefault: true },
      data: { isDefault: false },
    });
  }

  // ── Credentials ──────────────────────────────────────────────────

  async upsertCredential(accountId: string, data: Partial<IPaymentProviderCredential>): Promise<IPaymentProviderCredential> {
    return this.prisma.paymentProviderCredential.upsert({
      where: { accountId },
      create: { accountId, ...data } as any,
      update: data as any,
    }) as Promise<IPaymentProviderCredential>;
  }

  async findCredentialByAccountId(accountId: string): Promise<IPaymentProviderCredential | null> {
    return this.prisma.paymentProviderCredential.findFirst({ where: { accountId } }) as Promise<IPaymentProviderCredential | null>;
  }

  // ── Transactions ─────────────────────────────────────────────────

  async createTransaction(data: Partial<IPaymentTransaction>): Promise<IPaymentTransaction> {
    return this.prisma.paymentTransaction.create({ data: data as any }) as Promise<IPaymentTransaction>;
  }

  async findTransactionById(id: string): Promise<IPaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({ where: { id } }) as Promise<IPaymentTransaction | null>;
  }

  async findTransactionByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<IPaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({ where: { workspaceId, idempotencyKey } }) as Promise<IPaymentTransaction | null>;
  }

  async findTransactionByExternalId(externalTransactionId: string): Promise<IPaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({ where: { externalTransactionId } }) as Promise<IPaymentTransaction | null>;
  }

  async findTransactions(workspaceId: string, filter: TransactionFilterDto): Promise<[IPaymentTransaction[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.invoiceId) where.invoiceId = filter.invoiceId;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.paymentTransaction.count({ where: where as any }),
    ]);

    return [data as IPaymentTransaction[], total];
  }

  async updateTransaction(id: string, data: Partial<IPaymentTransaction>): Promise<IPaymentTransaction> {
    return this.prisma.paymentTransaction.update({ where: { id }, data: data as any }) as Promise<IPaymentTransaction>;
  }

  // ── Webhook events ───────────────────────────────────────────────

  async findWebhookEvent(providerKey: string, externalEventId: string): Promise<IPaymentWebhookEvent | null> {
    return this.prisma.paymentWebhookEvent.findFirst({ where: { providerKey, externalEventId } }) as Promise<IPaymentWebhookEvent | null>;
  }

  async createWebhookEvent(data: Partial<IPaymentWebhookEvent>): Promise<IPaymentWebhookEvent> {
    return this.prisma.paymentWebhookEvent.create({ data: data as any }) as Promise<IPaymentWebhookEvent>;
  }

  async updateWebhookEvent(id: string, data: Partial<IPaymentWebhookEvent>): Promise<IPaymentWebhookEvent> {
    return this.prisma.paymentWebhookEvent.update({ where: { id }, data: data as any }) as Promise<IPaymentWebhookEvent>;
  }

  // ── Health history ───────────────────────────────────────────────

  async createHealthHistory(data: Partial<IPaymentProviderHealthHistory>): Promise<IPaymentProviderHealthHistory> {
    return this.prisma.paymentProviderHealthHistory.create({ data: data as any }) as Promise<IPaymentProviderHealthHistory>;
  }
}
