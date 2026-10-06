import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RfqRepository } from './rfq.repository';
import { RfqNotificationQueue } from './jobs';
import {
  CreateRfqDto,
  UpdateRfqDto,
  CancelRfqDto,
  CloseRfqDto,
  SubmitRfqResponseDto,
  RfqFilterDto,
  RfqResponseDto,
  RfqListResponseDto,
  RfqSupplierResponseDto,
} from './dto';
import {
  RfqStatus,
  RfqSupplierResponseStatus,
  type RfqAttachment,
} from './interfaces';
import { RFQ_CONSTANTS } from './constants';
import { SupplierProviderManager } from '@modules/supplier-provider/manager/supplier-provider.manager';
import { SuppliersService } from '@modules/suppliers/suppliers.service';
import type {
  SupplierProviderCode,
  WorkspaceProviderConfig,
} from '@modules/supplier-provider/interfaces';

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly repository: RfqRepository,
    private readonly notificationQueue: RfqNotificationQueue,
    private readonly providerManager: SupplierProviderManager,
    private readonly suppliersService: SuppliersService,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async create(workspaceId: string, dto: CreateRfqDto): Promise<RfqResponseDto> {
    // Prevent duplicate active RFQs for same product/opportunity
    if (dto.productId || dto.opportunityId) {
      const duplicate = await this.repository.findActiveDuplicate(
        workspaceId,
        dto.productId,
        dto.opportunityId,
      );
      if (duplicate) {
        throw new ConflictException(
          `An active RFQ already exists for this ${dto.productId ? 'product' : 'opportunity'} (RFQ#: ${duplicate['rfqNumber']})`,
        );
      }
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const rfqNumber = `${RFQ_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(RFQ_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;

    const record = await this.repository.createRfq({
      workspaceId,
      rfqNumber,
      rfqSequence: sequence,
      title: dto.title,
      description: dto.description ?? null,
      productId: dto.productId ?? null,
      opportunityId: dto.opportunityId ?? null,
      status: RfqStatus.DRAFT,
      quantity: dto.quantity,
      moq: dto.moq ?? null,
      targetPrice: dto.targetPrice ?? null,
      currency: dto.currency ?? 'USD',
      requiredDeliveryDate: dto.requiredDeliveryDate ? new Date(dto.requiredDeliveryDate) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      paymentTerms: dto.paymentTerms ?? null,
      shippingTerms: dto.shippingTerms ?? null,
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
    });

    // Create supplier response records
    if (dto.supplierIds.length) {
      await this.repository.createManyRfqSuppliers(
        dto.supplierIds.map((supplierId) => ({
          rfqId: record['id'] as string,
          supplierId,
          workspaceId,
          status: RfqSupplierResponseStatus.PENDING,
        })),
      );
    }

    await this.notificationQueue.enqueue({
      rfqId: record['id'] as string,
      rfqNumber,
      workspaceId,
      event: RFQ_CONSTANTS.EVENTS.CREATED,
    });

    this.logger.log(`RFQ created: ${rfqNumber}`);
    return this.mapToResponse(await this.repository.findById(record['id'] as string, workspaceId) as Record<string, unknown>);
  }

  // ── Send ─────────────────────────────────────────────────────

  async send(id: string, workspaceId: string): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== RfqStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT RFQs can be sent. Current status: ${record['status']}`);
    }

    const sentAt = new Date();
    const supplierResponses = (record['supplierResponses'] as Record<string, unknown>[]) ?? [];

    // Mark all supplier records as pending with sentAt
    await Promise.all(
      supplierResponses.map((sr) =>
        this.repository.updateRfqSupplier(sr['id'] as string, { sentAt }),
      ),
    );

    const updated = await this.repository.updateRfq(id, {
      status: RfqStatus.SENT,
    });

    await this.notificationQueue.enqueue({
      rfqId: id,
      rfqNumber: updated['rfqNumber'] as string,
      workspaceId,
      event: RFQ_CONSTANTS.EVENTS.SENT,
    });

    this.logger.log(`RFQ sent: ${updated['rfqNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: RfqFilterDto): Promise<RfqListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  // ── Update (DRAFT only) ──────────────────────────────────────

  async update(id: string, workspaceId: string, dto: UpdateRfqDto): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== RfqStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT RFQs can be updated');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data['title'] = dto.title;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.quantity !== undefined) data['quantity'] = dto.quantity;
    if (dto.moq !== undefined) data['moq'] = dto.moq;
    if (dto.targetPrice !== undefined) data['targetPrice'] = dto.targetPrice;
    if (dto.currency !== undefined) data['currency'] = dto.currency;
    if (dto.requiredDeliveryDate !== undefined) data['requiredDeliveryDate'] = new Date(dto.requiredDeliveryDate);
    if (dto.expiresAt !== undefined) data['expiresAt'] = new Date(dto.expiresAt);
    if (dto.paymentTerms !== undefined) data['paymentTerms'] = dto.paymentTerms;
    if (dto.shippingTerms !== undefined) data['shippingTerms'] = dto.shippingTerms;
    if (dto.notes !== undefined) data['notes'] = dto.notes;

    const updated = await this.repository.updateRfq(id, data);
    return this.mapToResponse(updated);
  }

  // ── Supplier response ────────────────────────────────────────

  async submitSupplierResponse(
    rfqId: string,
    supplierId: string,
    workspaceId: string,
    dto: SubmitRfqResponseDto,
  ): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(rfqId, workspaceId);

    if (![RfqStatus.SENT, RfqStatus.PARTIALLY_RESPONDED].includes(record['status'] as RfqStatus)) {
      throw new BadRequestException(`Cannot submit response for RFQ with status: ${record['status']}`);
    }

    const rfqSupplier = await this.repository.findRfqSupplier(rfqId, supplierId);
    if (!rfqSupplier) {
      throw new NotFoundException(`Supplier ${supplierId} is not linked to this RFQ`);
    }

    await this.repository.updateRfqSupplier(rfqSupplier['id'] as string, {
      status: dto.status,
      respondedAt: new Date(),
      quotedPrice: dto.quotedPrice ?? null,
      quotedLeadTimeDays: dto.quotedLeadTimeDays ?? null,
      quotedMoq: dto.quotedMoq ?? null,
      supplierNotes: dto.supplierNotes ?? null,
      counterOfferDetails: dto.counterOfferDetails ?? null,
    });

    // Recalculate RFQ status
    const { responded, total } = await this.repository.countResponded(rfqId);
    let newStatus: RfqStatus = record['status'] as RfqStatus;
    if (responded === total) newStatus = RfqStatus.RESPONDED;
    else if (responded > 0) newStatus = RfqStatus.PARTIALLY_RESPONDED;

    const updated = await this.repository.updateRfq(rfqId, { status: newStatus });

    await this.notificationQueue.enqueue({
      rfqId,
      rfqNumber: updated['rfqNumber'] as string,
      workspaceId,
      event: RFQ_CONSTANTS.EVENTS.RESPONDED,
      supplierId,
    });

    this.logger.log(`RFQ ${updated['rfqNumber']} response submitted by supplier ${supplierId}`);
    return this.mapToResponse(updated);
  }

  // ── Cancel ───────────────────────────────────────────────────

  async cancel(id: string, workspaceId: string, dto: CancelRfqDto): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    const terminal: string[] = ['CANCELLED', 'CLOSED', 'EXPIRED'];

    if (terminal.includes(record['status'] as string)) {
      throw new BadRequestException(`RFQ is already in terminal status: ${record['status']}`);
    }

    const updated = await this.repository.updateRfq(id, {
      status: RfqStatus.CANCELLED,
      cancelReason: dto.reason,
    });

    await this.notificationQueue.enqueue({
      rfqId: id,
      rfqNumber: updated['rfqNumber'] as string,
      workspaceId,
      event: RFQ_CONSTANTS.EVENTS.CANCELLED,
    });

    this.logger.log(`RFQ cancelled: ${updated['rfqNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Close ────────────────────────────────────────────────────

  async close(id: string, workspaceId: string, dto: CloseRfqDto): Promise<RfqResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    const allowedToClose: string[] = ['SENT', 'PARTIALLY_RESPONDED', 'RESPONDED'];

    if (!allowedToClose.includes(record['status'] as string)) {
      throw new BadRequestException(`RFQ with status ${record['status']} cannot be closed`);
    }

    const updated = await this.repository.updateRfq(id, {
      status: RfqStatus.CLOSED,
      closeReason: dto.reason ?? null,
    });

    await this.notificationQueue.enqueue({
      rfqId: id,
      rfqNumber: updated['rfqNumber'] as string,
      workspaceId,
      event: RFQ_CONSTANTS.EVENTS.CLOSED,
    });

    this.logger.log(`RFQ closed: ${updated['rfqNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Expire (called by scheduler) ─────────────────────────────

  async expireOverdueRfqs(): Promise<void> {
    const expired = await this.repository.findExpiredRfqs();

    for (const rfq of expired) {
      await this.repository.updateRfq(rfq['id'] as string, { status: RfqStatus.EXPIRED });
      await this.notificationQueue.enqueue({
        rfqId: rfq['id'] as string,
        rfqNumber: rfq['rfqNumber'] as string,
        workspaceId: rfq['workspaceId'] as string,
        event: RFQ_CONSTANTS.EVENTS.EXPIRED,
      });
      this.logger.log(`RFQ expired: ${rfq['rfqNumber']}`);
    }
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== RfqStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT RFQs can be deleted');
    }

    await this.repository.softDelete(id);
    this.logger.log(`RFQ soft-deleted: ${record['rfqNumber']}`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`RFQ not found: ${id}`);
    return record;
  }

  private mapSupplierResponse(sr: Record<string, unknown>): RfqSupplierResponseDto {
    return {
      id: sr['id'] as string,
      rfqId: sr['rfqId'] as string,
      supplierId: sr['supplierId'] as string,
      status: sr['status'] as RfqSupplierResponseStatus,
      sentAt: sr['sentAt'] as Date | null,
      respondedAt: sr['respondedAt'] as Date | null,
      quotedPrice: sr['quotedPrice'] as number | null,
      quotedLeadTimeDays: sr['quotedLeadTimeDays'] as number | null,
      quotedMoq: sr['quotedMoq'] as number | null,
      supplierNotes: sr['supplierNotes'] as string | null,
      counterOfferDetails: sr['counterOfferDetails'] as Record<string, unknown> | null,
      createdAt: sr['createdAt'] as Date,
      updatedAt: sr['updatedAt'] as Date,
    };
  }

  private mapToResponse(r: Record<string, unknown>): RfqResponseDto {
    const supplierResponses = r['supplierResponses'] as Record<string, unknown>[] | undefined;
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      rfqNumber: r['rfqNumber'] as string,
      title: r['title'] as string,
      description: r['description'] as string | null,
      productId: r['productId'] as string | null,
      opportunityId: r['opportunityId'] as string | null,
      status: r['status'] as RfqStatus,
      quantity: r['quantity'] as number,
      moq: r['moq'] as number | null,
      targetPrice: r['targetPrice'] as number | null,
      currency: r['currency'] as string,
      requiredDeliveryDate: r['requiredDeliveryDate'] as Date | null,
      expiresAt: r['expiresAt'] as Date | null,
      paymentTerms: r['paymentTerms'] as string | null,
      shippingTerms: r['shippingTerms'] as string | null,
      notes: r['notes'] as string | null,
      attachments: r['attachments'] as RfqAttachment[] | null,
      supplierResponses: supplierResponses?.map((sr) => this.mapSupplierResponse(sr)),
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }

  // ── Provider dispatch ─────────────────────────────────────────

  /**
   * Dispatch an RFQ to suppliers via the provider framework when provider identities are available.
   * For each RFQ supplier that has a recognized provider identity, we use SupplierProviderManager
   * to submit a quotation request and store the provider quotation reference.
   */
  async dispatchViaProvider(
    rfqId: string,
    workspaceId: string,
    options?: { providerCode?: SupplierProviderCode; configs?: WorkspaceProviderConfig[] },
  ): Promise<{ dispatched: number; skipped: number }> {
    const record = await this.getOrThrow(rfqId, workspaceId);

    if (![RfqStatus.DRAFT, RfqStatus.SENT].includes(record['status'] as RfqStatus)) {
      throw new BadRequestException(
        `Cannot dispatch via provider for RFQ with status: ${record['status']}`,
      );
    }

    const supplierResponses = (record['supplierResponses'] as Record<string, unknown>[]) ?? [];
    let dispatched = 0;
    let skipped = 0;

    for (const sr of supplierResponses) {
      const supplierId = sr['supplierId'] as string;

      // Fetch provider identities for this supplier
      let identities: Record<string, unknown>[] = [];
      try {
        identities = await this.suppliersService.getProviderIdentities(supplierId, workspaceId);
      } catch {
        skipped++;
        continue;
      }

      if (!identities.length) {
        skipped++;
        continue;
      }

      // Pick the preferred identity (based on options or first available)
      const identity = options?.providerCode
        ? identities.find((i) => i['providerCode'] === options.providerCode)
        : identities[0];

      if (!identity) {
        skipped++;
        continue;
      }

      try {
        const response = await this.providerManager.requestQuotation(
          workspaceId,
          {
            providerSupplierId: identity['providerSupplierId'] as string,
            quantity: record['quantity'] as number,
            requirements: record['description'] as string | undefined,
          },
          {
            providerCode: identity['providerCode'] as SupplierProviderCode,
            ...options,
          },
        );

        if (response.success && response.data) {
          await this.repository.updateRfqSupplier(sr['id'] as string, {
            providerCode: identity['providerCode'] as string,
            providerQuotationRef: response.data.providerQuotationId,
            dispatchedViaProvider: true,
            sentAt: new Date(),
          });
          dispatched++;
        } else {
          this.logger.warn(
            `Provider dispatch failed for supplier ${supplierId}: ${response.error?.message}`,
          );
          skipped++;
        }
      } catch (error) {
        this.logger.warn(
          `Provider dispatch error for supplier ${supplierId}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
        skipped++;
      }
    }

    // If any were dispatched and RFQ is still DRAFT, transition to SENT
    if (dispatched > 0 && record['status'] === RfqStatus.DRAFT) {
      await this.repository.updateRfq(rfqId, { status: RfqStatus.SENT });
    }

    this.logger.log(`RFQ ${record['rfqNumber']} provider dispatch: ${dispatched} dispatched, ${skipped} skipped`);
    return { dispatched, skipped };
  }
}
