import { apiClient } from '@/lib/api/axios';
import type {
  CapturePaymentPayload,
  ConfigurePaymentCredentialsPayload,
  CreatePaymentPayload,
  PaginatedResult,
  PaymentConnectionTestResult,
  PaymentHealthResult,
  PaymentProviderAccount,
  PaymentTransaction,
  RefundPaymentPayload,
  RegisterPaymentProviderAccountPayload,
  TransactionFilterParams,
  UpdatePaymentProviderAccountPayload,
} from '@/types';

const BASE = '/payment-provider';

export async function listPaymentProviderAccounts(providerKey?: string): Promise<PaymentProviderAccount[]> {
  const { data } = await apiClient.get<PaymentProviderAccount[]>(`${BASE}/accounts`, { params: providerKey ? { providerKey } : undefined });
  return data;
}

export async function registerPaymentProviderAccount(payload: RegisterPaymentProviderAccountPayload): Promise<PaymentProviderAccount> {
  const { data } = await apiClient.post<PaymentProviderAccount>(`${BASE}/accounts`, payload);
  return data;
}

export async function getPaymentProviderAccount(id: string): Promise<PaymentProviderAccount> {
  const { data } = await apiClient.get<PaymentProviderAccount>(`${BASE}/accounts/${id}`);
  return data;
}

export async function updatePaymentProviderAccount(id: string, payload: UpdatePaymentProviderAccountPayload): Promise<PaymentProviderAccount> {
  const { data } = await apiClient.patch<PaymentProviderAccount>(`${BASE}/accounts/${id}`, payload);
  return data;
}

/** Fields are write-only — the backend encrypts and never echoes them back; this resolves to `{ configured: true }` only. */
export async function configurePaymentCredentials(id: string, payload: ConfigurePaymentCredentialsPayload): Promise<{ configured: boolean }> {
  const { data } = await apiClient.post<{ configured: boolean }>(`${BASE}/accounts/${id}/credentials`, payload);
  return data;
}

export async function testPaymentProviderConnection(id: string): Promise<PaymentConnectionTestResult> {
  const { data } = await apiClient.post<PaymentConnectionTestResult>(`${BASE}/accounts/${id}/test-connection`);
  return data;
}

export async function checkAllPaymentProviderHealth(): Promise<PaymentHealthResult[]> {
  const { data } = await apiClient.post<PaymentHealthResult[]>(`${BASE}/health/check-all`);
  return data;
}

export async function createPayment(payload: CreatePaymentPayload): Promise<PaymentTransaction> {
  const { data } = await apiClient.post<PaymentTransaction>(`${BASE}/payments`, payload);
  return data;
}

export async function listPaymentTransactions(params: TransactionFilterParams = {}): Promise<PaginatedResult<PaymentTransaction>> {
  const { data } = await apiClient.get<PaginatedResult<PaymentTransaction>>(`${BASE}/payments`, { params });
  return data;
}

export async function getPaymentTransaction(id: string): Promise<PaymentTransaction> {
  const { data } = await apiClient.get<PaymentTransaction>(`${BASE}/payments/${id}`);
  return data;
}

export async function getPaymentStatus(id: string): Promise<PaymentTransaction> {
  const { data } = await apiClient.get<PaymentTransaction>(`${BASE}/payments/${id}/status`);
  return data;
}

export async function capturePayment(id: string, payload: CapturePaymentPayload = {}): Promise<PaymentTransaction> {
  const { data } = await apiClient.post<PaymentTransaction>(`${BASE}/payments/${id}/capture`, payload);
  return data;
}

export async function cancelPayment(id: string): Promise<PaymentTransaction> {
  const { data } = await apiClient.post<PaymentTransaction>(`${BASE}/payments/${id}/cancel`);
  return data;
}

export async function refundPayment(id: string, payload: RefundPaymentPayload): Promise<PaymentTransaction> {
  const { data } = await apiClient.post<PaymentTransaction>(`${BASE}/payments/${id}/refund`, payload);
  return data;
}
