import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class InvoiceNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Invoice '${id}' not found`,
      errorCode: ErrorCode.INVOICE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class InvoiceAlreadyExistsException extends AtlasException {
  constructor(billingPeriodId: string) {
    super({
      message: `An invoice already exists for billing period '${billingPeriodId}'`,
      errorCode: ErrorCode.INVOICE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class InvoiceInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition invoice from '${from}' to '${to}'`,
      errorCode: ErrorCode.INVOICE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvoiceBillingPeriodNotFinalizedException extends AtlasException {
  constructor(status: string) {
    super({
      message: `Billing period is '${status}' — it must be billed before an invoice can be generated`,
      errorCode: ErrorCode.INVOICE_BILLING_PERIOD_NOT_FINALIZED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class InvoiceInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid invoice request: ${reason}`,
      errorCode: ErrorCode.INVOICE_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvoiceAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage invoices for this workspace',
      errorCode: ErrorCode.INVOICE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class InvoiceDocumentNotAvailableException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Invoice '${id}' has no generated document yet`,
      errorCode: ErrorCode.INVOICE_DOCUMENT_NOT_AVAILABLE,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
