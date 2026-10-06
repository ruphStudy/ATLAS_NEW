import {
  PaymentProviderAccountStatus,
  PaymentHealthState,
  PaymentTransactionType,
  PaymentTransactionStatus,
  PaymentConnectionStatus,
} from '../interfaces';

export class PaymentProviderAccountResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  accountHandle!: string;
  displayName!: string | null;
  country!: string | null;
  currency!: string | null;
  status!: PaymentProviderAccountStatus;
  priority!: number;
  isDefault!: boolean;
  capabilities!: string[];
  supportedCountries!: string[];
  supportedCurrencies!: string[];
  healthState!: PaymentHealthState;
  lastTestedAt!: Date | null;
  lastTestSuccess!: boolean | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaymentTransactionResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  invoiceId!: string | null;
  type!: PaymentTransactionType;
  status!: PaymentTransactionStatus;
  amount!: number;
  currency!: string;
  capturedAmount!: number | null;
  refundedAmount!: number;
  externalTransactionId!: string | null;
  errorCode!: string | null;
  errorMessage!: string | null;
  retryable!: boolean | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedPaymentTransactionResponseDto {
  data!: PaymentTransactionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PaymentHealthResultResponseDto {
  providerKey!: string;
  accountId?: string;
  state!: PaymentHealthState;
  connectionStatus!: PaymentConnectionStatus;
  responseTimeMs?: number;
  errorMessage?: string;
  checkedAt!: Date;
}

export class ConnectionTestResultResponseDto {
  correlationId!: string;
  providerKey!: string;
  accountId!: string;
  success!: boolean;
  connectionStatus!: PaymentConnectionStatus;
  responseTimeMs!: number;
  errorMessage?: string;
  testedAt!: Date;
}
