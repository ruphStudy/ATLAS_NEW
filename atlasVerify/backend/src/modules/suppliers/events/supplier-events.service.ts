import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SUPPLIER_EVENTS } from '../constants';
import type {
  SupplierCreatedEvent,
  SupplierUpdatedEvent,
  SupplierStatusChangedEvent,
  SupplierVerifiedEvent,
} from '../interfaces';

@Injectable()
export class SupplierEventsService {
  private readonly logger = new Logger(SupplierEventsService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emitCreated(payload: SupplierCreatedEvent): void {
    this.logger.debug(`Emitting ${SUPPLIER_EVENTS.CREATED}: ${payload.supplierId}`);
    this.emitter.emit(SUPPLIER_EVENTS.CREATED, payload);
  }

  emitUpdated(payload: SupplierUpdatedEvent): void {
    this.logger.debug(`Emitting ${SUPPLIER_EVENTS.UPDATED}: ${payload.supplierId}`);
    this.emitter.emit(SUPPLIER_EVENTS.UPDATED, payload);
  }

  emitStatusChanged(payload: SupplierStatusChangedEvent): void {
    this.logger.debug(
      `Emitting ${SUPPLIER_EVENTS.STATUS_CHANGED}: ${payload.supplierId} ${payload.previousStatus} → ${payload.newStatus}`,
    );
    this.emitter.emit(SUPPLIER_EVENTS.STATUS_CHANGED, payload);
  }

  emitVerified(payload: SupplierVerifiedEvent): void {
    this.logger.debug(`Emitting ${SUPPLIER_EVENTS.VERIFIED}: ${payload.supplierId}`);
    this.emitter.emit(SUPPLIER_EVENTS.VERIFIED, payload);
  }
}
