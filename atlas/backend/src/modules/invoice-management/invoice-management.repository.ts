import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IInvoice, IInvoiceHistory } from './interfaces';
import { InvoiceFilterDto } from './dto';
import { DUE_DATE_CHECK_STATUSES, SYNC_CHECK_STATUSES } from './constants';

@Injectable()
export class InvoiceManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Invoices ─────────────────────────────────────────────────────

  async create(data: Partial<IInvoice>): Promise<IInvoice> {
    return this.prisma.invoice.create({ data: data as any }) as unknown as Promise<IInvoice>;
  }

  async findById(id: string): Promise<IInvoice | null> {
    return this.prisma.invoice.findFirst({ where: { id } }) as Promise<IInvoice | null>;
  }

  async findByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<IInvoice | null> {
    return this.prisma.invoice.findFirst({ where: { workspaceId, idempotencyKey } }) as Promise<IInvoice | null>;
  }

  async findByBillingPeriodId(billingPeriodId: string): Promise<IInvoice | null> {
    return this.prisma.invoice.findFirst({ where: { billingPeriodId } }) as Promise<IInvoice | null>;
  }

  /** Per-workspace sequential counter — same idiom as Purchase Order's `getNextSequence`. */
  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.prisma.invoice.findFirst({
      where: { workspaceId },
      orderBy: { invoiceSequence: 'desc' },
      select: { invoiceSequence: true },
    });
    return (last?.invoiceSequence ?? 0) + 1;
  }

  async findAll(workspaceId: string, filter: InvoiceFilterDto): Promise<[IInvoice[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (!filter.includeArchived) where.archivedAt = null;
    if (filter.subscriptionId) where.subscriptionId = filter.subscriptionId;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.invoiceNumber = { contains: filter.search, mode: 'insensitive' };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.invoice.count({ where: where as any }),
    ]);

    return [data as unknown as IInvoice[], total];
  }

  async update(id: string, data: Partial<IInvoice>): Promise<IInvoice> {
    return this.prisma.invoice.update({ where: { id }, data: data as any }) as unknown as Promise<IInvoice>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors Billing Engine / Subscription Management's approach) ──

  async findDueForOverdue(before: Date): Promise<IInvoice[]> {
    return this.prisma.invoice.findMany({
      where: { status: { in: DUE_DATE_CHECK_STATUSES as any }, dueDate: { lte: before }, archivedAt: null },
    }) as unknown as Promise<IInvoice[]>;
  }

  async findForBillingSync(): Promise<IInvoice[]> {
    return this.prisma.invoice.findMany({
      where: { status: { in: SYNC_CHECK_STATUSES as any }, billingPeriodId: { not: null }, archivedAt: null },
    }) as unknown as Promise<IInvoice[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IInvoiceHistory>): Promise<IInvoiceHistory> {
    return this.prisma.invoiceHistory.create({ data: data as any }) as Promise<IInvoiceHistory>;
  }

  async findHistory(invoiceId: string): Promise<IInvoiceHistory[]> {
    return this.prisma.invoiceHistory.findMany({ where: { invoiceId }, orderBy: { createdAt: 'asc' } }) as Promise<IInvoiceHistory[]>;
  }
}
