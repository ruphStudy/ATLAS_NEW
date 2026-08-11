import { Injectable, Logger } from '@nestjs/common';
import { BillingEngineService } from '@modules/billing-engine/billing-engine.service';
import { DocumentManagementService } from '@modules/document-management/document-management.service';
import { DocumentType } from '@modules/document-management/interfaces';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationTargetType } from '@modules/notifications/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { InvoiceManagementRepository } from './invoice-management.repository';
import { InvoiceManagementEventQueue } from './jobs';
import {
  GenerateInvoiceDto,
  AttachInvoiceDocumentDto,
  SendInvoiceDto,
  InvoiceReasonDto,
  InvoiceFilterDto,
  PaginatedInvoiceResponseDto,
} from './dto';
import {
  IInvoice,
  IInvoiceHistory,
  IInvoiceLineItem,
  IInvoiceTaxBreakdownEntry,
  InvoiceStatus,
  InvoiceType,
  InvoiceDeliveryStatus,
  InvoiceChangeType,
  InvoiceManagementEvent,
} from './interfaces';
import {
  INVOICE_ALLOWED_TRANSITIONS,
  INVOICE_MANAGEMENT_MODULE,
  INVOICE_MANAGE_ROLES,
  INVOICE_NUMBER_PAD_LENGTH,
  INVOICE_NUMBER_PREFIX,
  FINALIZED_BILLING_PERIOD_STATUSES,
} from './constants';
import {
  InvoiceAccessDeniedException,
  InvoiceAlreadyExistsException,
  InvoiceBillingPeriodNotFinalizedException,
  InvoiceDocumentNotAvailableException,
  InvoiceInvalidStateTransitionException,
  InvoiceNotFoundException,
} from './exceptions/invoice-management.exceptions';

interface ITransitionOptions {
  changeType: InvoiceChangeType;
  event: InvoiceManagementEvent;
  reason?: string;
  extraFields?: Partial<IInvoice>;
}

@Injectable()
export class InvoiceManagementService {
  private readonly logger = new Logger(InvoiceManagementService.name);

  constructor(
    private readonly repository: InvoiceManagementRepository,
    private readonly billingEngineService: BillingEngineService,
    private readonly documentManagementService: DocumentManagementService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: InvoiceManagementEventQueue,
  ) {}

  // ── Generation ───────────────────────────────────────────────────

  async generateInvoice(workspaceId: string, userId: string, userRole: string, dto: GenerateInvoiceDto): Promise<IInvoice> {
    this.assertCanManage(userRole);

    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const duplicate = await this.repository.findByBillingPeriodId(dto.billingPeriodId);
    if (duplicate) {
      throw new InvoiceAlreadyExistsException(dto.billingPeriodId);
    }

    const billingPeriod = await this.billingEngineService.getBillingPeriod(dto.billingPeriodId, workspaceId);
    if (!FINALIZED_BILLING_PERIOD_STATUSES.includes(billingPeriod.status)) {
      throw new InvoiceBillingPeriodNotFinalizedException(billingPeriod.status);
    }

    const billingItems = await this.billingEngineService.getItems(dto.billingPeriodId, workspaceId);

    const lineItems: IInvoiceLineItem[] = billingItems.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      amount: item.amount,
      resourceKey: item.resourceKey,
    }));

    const taxBreakdown: IInvoiceTaxBreakdownEntry[] = billingItems
      .filter((item) => item.type === 'TAX')
      .map((item) => ({
        label: item.description,
        ratePercent: ((item.calculationInput as Record<string, unknown> | null)?.taxRatePercent as number) ?? null,
        amount: item.amount,
      }));

    const sequence = await this.repository.getNextSequence(workspaceId);
    const invoiceNumber = `${INVOICE_NUMBER_PREFIX}-${String(sequence).padStart(INVOICE_NUMBER_PAD_LENGTH, '0')}`;

    const invoice = await this.repository.create({
      workspaceId,
      organizationId: billingPeriod.organizationId,
      billingPeriodId: billingPeriod.id,
      subscriptionId: billingPeriod.subscriptionId,
      invoiceNumber,
      invoiceSequence: sequence,
      type: dto.type ?? this.inferInvoiceType(billingPeriod.triggerType),
      status: InvoiceStatus.DRAFT,
      currency: billingPeriod.currency,
      subtotal: billingPeriod.subtotal,
      discountTotal: billingPeriod.discountTotal,
      creditTotal: billingPeriod.creditTotal,
      taxTotal: billingPeriod.taxTotal,
      total: billingPeriod.total,
      amountPaid: billingPeriod.amountPaid,
      balanceDue: billingPeriod.balanceDue,
      lineItems: lineItems as any,
      taxBreakdown: taxBreakdown as any,
      dueDate: billingPeriod.dueDate,
      idempotencyKey: dto.idempotencyKey ?? null,
      version: 1,
      createdBy: userId,
    });

    await this.repository.createHistory({
      invoiceId: invoice.id,
      workspaceId,
      changeType: InvoiceChangeType.CREATED,
      toStatus: InvoiceStatus.DRAFT,
      changedBy: userId,
      snapshot: invoice as any,
    });

    await this.recordAudit(workspaceId, userId, 'invoice-management.invoice.created', AuditActionCategory.CREATE, invoice.id);
    await this.publishEvent(InvoiceManagementEvent.INVOICE_CREATED, invoice, userId);
    return invoice;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async issueInvoice(id: string, workspaceId: string, userId: string, userRole: string): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    return this.transition(invoice, InvoiceStatus.ISSUED, userId, {
      changeType: InvoiceChangeType.ISSUED,
      event: InvoiceManagementEvent.INVOICE_ISSUED,
      extraFields: { issueDate: new Date() },
    });
  }

  async attachDocument(id: string, workspaceId: string, userId: string, userRole: string, dto: AttachInvoiceDocumentDto): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    const document = await this.documentManagementService.create(workspaceId, userId, {
      documentType: DocumentType.FINANCE,
      title: `Invoice ${invoice.invoiceNumber}`,
      documentNumber: invoice.invoiceNumber,
      sourceModule: INVOICE_MANAGEMENT_MODULE,
      entityType: 'Invoice',
      entityId: id,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      contentBase64: dto.contentBase64,
    });

    const updated = await this.repository.update(id, { documentId: document.id, version: invoice.version + 1 });
    await this.recordAudit(workspaceId, userId, 'invoice-management.invoice.document_attached', AuditActionCategory.UPDATE, id);
    return updated;
  }

  async sendInvoice(id: string, workspaceId: string, userId: string, userRole: string, dto: SendInvoiceDto): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new InvoiceInvalidStateTransitionException(invoice.status, 'SENT');
    }

    await this.notificationsService.create({
      workspaceId,
      targetType: dto.targetUserId ? NotificationTargetType.USER : NotificationTargetType.ROLE,
      targetUserId: dto.targetUserId,
      targetRole: dto.targetUserId ? undefined : 'OWNER',
      category: 'invoice',
      title: `Invoice ${invoice.invoiceNumber}`,
      message: `Invoice ${invoice.invoiceNumber} for ${invoice.total} ${invoice.currency} is ready — balance due ${invoice.balanceDue} ${invoice.currency}`,
      sourceModule: INVOICE_MANAGEMENT_MODULE,
      entityType: 'Invoice',
      entityId: id,
      actionRequired: invoice.balanceDue > 0,
    });

    const updated = await this.repository.update(id, {
      deliveryStatus: InvoiceDeliveryStatus.SENT,
      lastSentAt: new Date(),
      sendAttempts: invoice.sendAttempts + 1,
      version: invoice.version + 1,
    });

    await this.repository.createHistory({
      invoiceId: id,
      workspaceId,
      changeType: InvoiceChangeType.SENT,
      fromStatus: invoice.status,
      toStatus: invoice.status,
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, 'invoice-management.invoice.sent', AuditActionCategory.UPDATE, id);
    await this.publishEvent(InvoiceManagementEvent.INVOICE_SENT, updated, userId);
    return updated;
  }

  async recordDownload(id: string, workspaceId: string, userId: string): Promise<IInvoice> {
    const invoice = await this.getVisibleOrThrow(id, workspaceId);
    if (!invoice.documentId) {
      throw new InvoiceDocumentNotAvailableException(id);
    }

    const updated = await this.repository.update(id, {
      downloadCount: invoice.downloadCount + 1,
      lastDownloadedAt: new Date(),
    });

    await this.repository.createHistory({
      invoiceId: id,
      workspaceId,
      changeType: InvoiceChangeType.DOWNLOADED,
      fromStatus: invoice.status,
      toStatus: invoice.status,
      changedBy: userId,
      snapshot: updated as any,
    });

    return updated;
  }

  async voidInvoice(id: string, workspaceId: string, userId: string, userRole: string, dto: InvoiceReasonDto): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    return this.transition(invoice, InvoiceStatus.VOID, userId, {
      changeType: InvoiceChangeType.VOIDED,
      event: InvoiceManagementEvent.INVOICE_VOIDED,
      reason: dto.reason,
      extraFields: { voidedAt: new Date(), voidReason: dto.reason },
    });
  }

  async cancelInvoice(id: string, workspaceId: string, userId: string, userRole: string, dto: InvoiceReasonDto): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    return this.transition(invoice, InvoiceStatus.CANCELLED, userId, {
      changeType: InvoiceChangeType.CANCELLED,
      event: InvoiceManagementEvent.INVOICE_CANCELLED,
      reason: dto.reason,
      extraFields: { cancelledAt: new Date(), cancellationReason: dto.reason },
    });
  }

  async archiveInvoice(id: string, workspaceId: string, userId: string, userRole: string): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    const updated = await this.repository.update(id, { archivedAt: new Date(), version: invoice.version + 1 });
    await this.repository.createHistory({
      invoiceId: id,
      workspaceId,
      changeType: InvoiceChangeType.ARCHIVED,
      fromStatus: invoice.status,
      toStatus: invoice.status,
      changedBy: userId,
      snapshot: updated as any,
    });
    await this.recordAudit(workspaceId, userId, 'invoice-management.invoice.archived', AuditActionCategory.UPDATE, id);
    return updated;
  }

  async restoreInvoice(id: string, workspaceId: string, userId: string, userRole: string): Promise<IInvoice> {
    this.assertCanManage(userRole);
    const invoice = await this.getVisibleOrThrow(id, workspaceId);

    const updated = await this.repository.update(id, { archivedAt: null, version: invoice.version + 1 });
    await this.repository.createHistory({
      invoiceId: id,
      workspaceId,
      changeType: InvoiceChangeType.RESTORED,
      fromStatus: invoice.status,
      toStatus: invoice.status,
      changedBy: userId,
      snapshot: updated as any,
    });
    await this.recordAudit(workspaceId, userId, 'invoice-management.invoice.restored', AuditActionCategory.UPDATE, id);
    return updated;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors Billing Engine / Subscription Management's approach) ──

  async processOverdueSweep(): Promise<{ overdue: number }> {
    const now = new Date();
    const due = await this.repository.findDueForOverdue(now);
    let overdue = 0;

    for (const invoice of due) {
      await this.transition(invoice, InvoiceStatus.OVERDUE, 'system', {
        changeType: InvoiceChangeType.OVERDUE,
        event: InvoiceManagementEvent.INVOICE_OVERDUE,
      });
      overdue += 1;
    }

    this.logger.log(`Overdue sweep: ${overdue} invoice(s) marked OVERDUE`);
    return { overdue };
  }

  /** Reconciles invoice status/amounts against their (still authoritative) Billing Engine `BillingPeriod` — never recalculates, only mirrors. */
  async processBillingSync(): Promise<{ synced: number; failed: number }> {
    const candidates = await this.repository.findForBillingSync();
    let synced = 0;
    let failed = 0;

    for (const invoice of candidates) {
      try {
        const billingPeriod = await this.billingEngineService.getBillingPeriod(invoice.billingPeriodId as string, invoice.workspaceId);
        const changed = await this.syncFromBillingPeriodState(invoice, billingPeriod);
        if (changed) synced += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(`Billing sync failed for invoice '${invoice.id}': ${(error as Error).message}`);
      }
    }

    return { synced, failed };
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getInvoice(id: string, workspaceId: string): Promise<IInvoice> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<IInvoiceHistory[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllInvoices(workspaceId: string, filter: InvoiceFilterDto): Promise<PaginatedInvoiceResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async syncFromBillingPeriodState(invoice: IInvoice, billingPeriod: { status: string; amountPaid: number; balanceDue: number; externalReference: unknown }): Promise<boolean> {
    if (billingPeriod.status === 'PAID' && invoice.status !== InvoiceStatus.PAID) {
      await this.transition(invoice, InvoiceStatus.PAID, 'system', {
        changeType: InvoiceChangeType.PAID,
        event: InvoiceManagementEvent.INVOICE_PAID,
        extraFields: { amountPaid: billingPeriod.amountPaid, balanceDue: 0, paymentReference: billingPeriod.externalReference as any },
      });
      return true;
    }
    if (billingPeriod.status === 'PARTIALLY_PAID' && (invoice.status !== InvoiceStatus.PARTIALLY_PAID || invoice.amountPaid !== billingPeriod.amountPaid)) {
      const isTransition = invoice.status !== InvoiceStatus.PARTIALLY_PAID;
      if (isTransition) {
        await this.transition(invoice, InvoiceStatus.PARTIALLY_PAID, 'system', {
          changeType: InvoiceChangeType.PARTIALLY_PAID,
          event: InvoiceManagementEvent.INVOICE_PARTIALLY_PAID,
          extraFields: { amountPaid: billingPeriod.amountPaid, balanceDue: billingPeriod.balanceDue },
        });
      } else {
        await this.repository.update(invoice.id, {
          amountPaid: billingPeriod.amountPaid,
          balanceDue: billingPeriod.balanceDue,
          version: invoice.version + 1,
        });
      }
      return true;
    }
    if (billingPeriod.status === 'VOID' && invoice.status !== InvoiceStatus.VOID && invoice.status !== InvoiceStatus.CANCELLED) {
      await this.transition(invoice, InvoiceStatus.VOID, 'system', {
        changeType: InvoiceChangeType.VOIDED,
        event: InvoiceManagementEvent.INVOICE_VOIDED,
        reason: 'Underlying billing period was voided',
        extraFields: { voidedAt: new Date(), voidReason: 'Underlying billing period was voided' },
      });
      return true;
    }
    if (billingPeriod.status === 'REFUNDED' && invoice.status !== InvoiceStatus.REFUNDED) {
      await this.transition(invoice, InvoiceStatus.REFUNDED, 'system', {
        changeType: InvoiceChangeType.REFUNDED,
        event: InvoiceManagementEvent.INVOICE_REFUNDED,
        extraFields: { refundedAt: new Date() },
      });
      return true;
    }
    return false;
  }

  private inferInvoiceType(triggerType: string): InvoiceType {
    if (triggerType === 'ONE_TIME') return InvoiceType.ONE_TIME;
    if (triggerType === 'MID_CYCLE_CHANGE' || triggerType === 'UPGRADE' || triggerType === 'DOWNGRADE') return InvoiceType.ADJUSTMENT;
    return InvoiceType.RECURRING;
  }

  private async transition(invoice: IInvoice, to: InvoiceStatus, userId: string, options: ITransitionOptions): Promise<IInvoice> {
    if (!INVOICE_ALLOWED_TRANSITIONS[invoice.status]?.includes(to)) {
      throw new InvoiceInvalidStateTransitionException(invoice.status, to);
    }

    const updated = await this.repository.update(invoice.id, {
      status: to,
      ...options.extraFields,
      version: invoice.version + 1,
    });

    await this.repository.createHistory({
      invoiceId: invoice.id,
      workspaceId: invoice.workspaceId,
      changeType: options.changeType,
      fromStatus: invoice.status,
      toStatus: to,
      reason: options.reason,
      changedBy: userId === 'system' ? null : userId,
      snapshot: updated as any,
    });

    await this.recordAudit(invoice.workspaceId, userId, `invoice-management.invoice.${options.changeType.toLowerCase()}`, AuditActionCategory.UPDATE, invoice.id);
    await this.publishEvent(options.event, updated, userId, options.reason ? { reason: options.reason } : undefined);
    return updated;
  }

  private assertCanManage(userRole: string): void {
    if (!INVOICE_MANAGE_ROLES.includes(userRole)) {
      throw new InvoiceAccessDeniedException();
    }
  }

  private async getVisibleOrThrow(id: string, workspaceId: string): Promise<IInvoice> {
    const invoice = await this.repository.findById(id);
    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new InvoiceNotFoundException(id);
    }
    return invoice;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: INVOICE_MANAGEMENT_MODULE,
      entityType: 'Invoice',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(event: InvoiceManagementEvent, invoice: IInvoice, actorId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({
      event,
      invoiceId: invoice.id,
      workspaceId: invoice.workspaceId,
      invoiceNumber: invoice.invoiceNumber,
      actorId: actorId === 'system' ? undefined : actorId,
      metadata,
    });
  }
}
