import { apiClient } from '@/lib/api/axios';
import type {
  AttachInvoiceDocumentPayload,
  GenerateInvoicePayload,
  Invoice,
  InvoiceFilterParams,
  InvoiceHistoryEntry,
  InvoiceReasonPayload,
  PaginatedResult,
  SendInvoicePayload,
} from '@/types';

const BASE = '/invoice-management';

export async function generateInvoice(payload: GenerateInvoicePayload): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices`, payload);
  return data;
}

export async function listInvoices(params: InvoiceFilterParams = {}): Promise<PaginatedResult<Invoice>> {
  const { data } = await apiClient.get<PaginatedResult<Invoice>>(`${BASE}/invoices`, { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`${BASE}/invoices/${id}`);
  return data;
}

export async function getInvoiceHistory(id: string): Promise<InvoiceHistoryEntry[]> {
  const { data } = await apiClient.get<InvoiceHistoryEntry[]>(`${BASE}/invoices/${id}/history`);
  return data;
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/issue`);
  return data;
}

export async function attachInvoiceDocument(id: string, payload: AttachInvoiceDocumentPayload): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/document`, payload);
  return data;
}

export async function sendInvoice(id: string, payload: SendInvoicePayload = {}): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/send`, payload);
  return data;
}

export async function recordInvoiceDownload(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/download`);
  return data;
}

export async function voidInvoice(id: string, payload: InvoiceReasonPayload): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/void`, payload);
  return data;
}

export async function cancelInvoice(id: string, payload: InvoiceReasonPayload): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/cancel`, payload);
  return data;
}

export async function archiveInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/archive`);
  return data;
}

export async function restoreInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`${BASE}/invoices/${id}/restore`);
  return data;
}
