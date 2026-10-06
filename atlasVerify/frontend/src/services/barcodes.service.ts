import { apiClient } from '@/lib/api/axios';
import type { Barcode, BarcodeFilterParams, BarcodeListResult, CreateLabelTemplatePayload, GenerateBarcodePayload, LabelTemplate, PrintLabelPayload, ScanBarcodePayload, ScanResult } from '@/types';

const BASE = '/barcodes';

export async function generateBarcode(payload: GenerateBarcodePayload): Promise<Barcode> {
  const { data } = await apiClient.post<Barcode>(`${BASE}/generate`, payload);
  return data;
}

export async function bulkGenerateBarcodes(items: GenerateBarcodePayload[]): Promise<Barcode[]> {
  const { data } = await apiClient.post<Barcode[]>(`${BASE}/generate/bulk`, { items });
  return data;
}

export async function assignBarcode(entityType: string, entityId: string, value: string): Promise<Barcode> {
  const { data } = await apiClient.post<Barcode>(`${BASE}/assign`, { entityType, entityId, value });
  return data;
}

export async function scanBarcode(payload: ScanBarcodePayload): Promise<ScanResult> {
  const { data } = await apiClient.post<ScanResult>(`${BASE}/scan`, payload);
  return data;
}

export async function printLabel(payload: PrintLabelPayload): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(`${BASE}/print`, payload);
  return data;
}

export async function bulkPrintLabels(barcodeIds: string[], templateId?: string, labelSize?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(`${BASE}/print/bulk`, { barcodeIds, templateId, labelSize });
  return data;
}

export async function listBarcodes(params: BarcodeFilterParams = {}): Promise<BarcodeListResult> {
  const { data } = await apiClient.get<BarcodeListResult>(BASE, { params });
  return data;
}

export async function getBarcodeById(id: string): Promise<Barcode> {
  const { data } = await apiClient.get<Barcode>(`${BASE}/${id}`);
  return data;
}

export async function replaceBarcode(id: string, reason?: string): Promise<Barcode> {
  const { data } = await apiClient.post<Barcode>(`${BASE}/${id}/replace`, { reason });
  return data;
}

export async function deactivateBarcode(id: string): Promise<Barcode> {
  const { data } = await apiClient.post<Barcode>(`${BASE}/${id}/deactivate`, {});
  return data;
}

export async function listLabelTemplates(params: { page?: number; limit?: number; entityType?: string } = {}): Promise<{ items: LabelTemplate[]; total: number; page: number; limit: number }> {
  const { data } = await apiClient.get(`${BASE}/templates`, { params });
  return data;
}

export async function createLabelTemplate(payload: CreateLabelTemplatePayload): Promise<LabelTemplate> {
  const { data } = await apiClient.post<LabelTemplate>(`${BASE}/templates`, payload);
  return data;
}

export async function deleteLabelTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/templates/${id}`);
}
