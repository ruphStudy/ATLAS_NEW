import { apiClient } from '@/lib/api/axios';
import type {
  ApplyGstVatPayload,
  CreateGstVatRegistrationPayload,
  CreateGstVatTaxCodePayload,
  GstVatAdjustment,
  GstVatApplicationResult,
  GstVatRegistration,
  GstVatRegistrationFilterParams,
  GstVatRegistrationListResult,
  GstVatTaxCode,
  GstVatTaxCodeFilterParams,
  GstVatTaxCodeListResult,
  GstVatTransactionFilterParams,
  GstVatTransactionListResult,
  GstVatValidationResult,
  RecordGstVatAdjustmentPayload,
  UpdateGstVatRegistrationPayload,
  UpdateGstVatTaxCodePayload,
} from '@/types';

const BASE = '/gst-vat';

export async function listGstVatRegistrations(params: GstVatRegistrationFilterParams = {}): Promise<GstVatRegistrationListResult> {
  const { data } = await apiClient.get(`${BASE}/registrations`, { params });
  return data;
}

export async function getGstVatRegistrationById(id: string): Promise<GstVatRegistration> {
  const { data } = await apiClient.get(`${BASE}/registrations/${id}`);
  return data;
}

export async function createGstVatRegistration(payload: CreateGstVatRegistrationPayload): Promise<GstVatRegistration> {
  const { data } = await apiClient.post(`${BASE}/registrations`, payload);
  return data;
}

export async function updateGstVatRegistration(id: string, payload: UpdateGstVatRegistrationPayload): Promise<GstVatRegistration> {
  const { data } = await apiClient.patch(`${BASE}/registrations/${id}`, payload);
  return data;
}

export async function getGstVatRegistrationHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get(`${BASE}/registrations/${id}/history`);
  return data;
}

export async function listGstVatTaxCodes(params: GstVatTaxCodeFilterParams = {}): Promise<GstVatTaxCodeListResult> {
  const { data } = await apiClient.get(`${BASE}/tax-codes`, { params });
  return data;
}

export async function createGstVatTaxCode(payload: CreateGstVatTaxCodePayload): Promise<GstVatTaxCode> {
  const { data } = await apiClient.post(`${BASE}/tax-codes`, payload);
  return data;
}

export async function updateGstVatTaxCode(id: string, payload: UpdateGstVatTaxCodePayload): Promise<GstVatTaxCode> {
  const { data } = await apiClient.patch(`${BASE}/tax-codes/${id}`, payload);
  return data;
}

export async function applyGstVat(payload: ApplyGstVatPayload): Promise<GstVatApplicationResult> {
  const { data } = await apiClient.post(`${BASE}/apply`, payload);
  return data;
}

export async function validateGstVatConfiguration(payload: ApplyGstVatPayload): Promise<GstVatValidationResult> {
  const { data } = await apiClient.post(`${BASE}/validate`, payload);
  return data;
}

export async function getGstVatTransactions(params: GstVatTransactionFilterParams = {}): Promise<GstVatTransactionListResult> {
  const { data } = await apiClient.get(`${BASE}/transactions`, { params });
  return data;
}

export async function getGstVatAdjustments(transactionId: string): Promise<GstVatAdjustment[]> {
  const { data } = await apiClient.get(`${BASE}/transactions/${transactionId}/adjustments`);
  return data;
}

export async function recordGstVatAdjustment(payload: RecordGstVatAdjustmentPayload): Promise<GstVatAdjustment> {
  const { data } = await apiClient.post(`${BASE}/adjustments`, payload);
  return data;
}
