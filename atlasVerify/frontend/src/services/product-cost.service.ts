import { apiClient } from '@/lib/api/axios';
import type { CalculateProductCostPayload, ProductCostCalculation, ProductCostFilterParams, ProductCostListResult } from '@/types';

const BASE = '/product-cost';

export async function calculateProductCost(payload: CalculateProductCostPayload): Promise<ProductCostCalculation> {
  const { data } = await apiClient.post<ProductCostCalculation>(BASE, payload);
  return data;
}

export async function listProductCosts(params: ProductCostFilterParams = {}): Promise<ProductCostListResult> {
  const { data } = await apiClient.get<ProductCostListResult>(BASE, { params });
  return data;
}

export async function getLatestProductCostByProduct(productId: string): Promise<ProductCostCalculation> {
  const { data } = await apiClient.get<ProductCostCalculation>(`${BASE}/product/${productId}/latest`);
  return data;
}

export async function getProductCostHistoryByProduct(productId: string): Promise<ProductCostCalculation[]> {
  const { data } = await apiClient.get<ProductCostCalculation[]>(`${BASE}/product/${productId}/history`);
  return data;
}

export async function getProductCostHistoryByRfq(rfqId: string): Promise<ProductCostCalculation[]> {
  const { data } = await apiClient.get<ProductCostCalculation[]>(`${BASE}/rfq/${rfqId}/history`);
  return data;
}

export async function getLatestProductCostByRfqSupplier(rfqSupplierId: string): Promise<ProductCostCalculation> {
  const { data } = await apiClient.get<ProductCostCalculation>(`${BASE}/rfq-supplier/${rfqSupplierId}/latest`);
  return data;
}

export async function getProductCostById(id: string): Promise<ProductCostCalculation> {
  const { data } = await apiClient.get<ProductCostCalculation>(`${BASE}/${id}`);
  return data;
}

export async function deleteProductCost(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
