import { apiClient } from '@/lib/api/axios';
import type {
  CalculateTaxPayload,
  CreateJurisdictionPayload,
  CreateTaxOverridePayload,
  CreateTaxRulePayload,
  RollbackTaxRulePayload,
  TaxCalculationRecordFilterParams,
  TaxCalculationRecordListResult,
  TaxCalculationResult,
  TaxJurisdiction,
  TaxJurisdictionFilterParams,
  TaxJurisdictionListResult,
  TaxRule,
  TaxRuleFilterParams,
  TaxRuleHistoryEntry,
  TaxRuleListResult,
  UpdateJurisdictionPayload,
  UpdateTaxRulePayload,
} from '@/types';

const BASE = '/tax';

export async function listJurisdictions(params: TaxJurisdictionFilterParams = {}): Promise<TaxJurisdictionListResult> {
  const { data } = await apiClient.get(`${BASE}/jurisdictions`, { params });
  return data;
}

export async function getJurisdictionByCode(code: string): Promise<TaxJurisdiction> {
  const { data } = await apiClient.get(`${BASE}/jurisdictions/${code}`);
  return data;
}

export async function registerJurisdiction(payload: CreateJurisdictionPayload): Promise<TaxJurisdiction> {
  const { data } = await apiClient.post(`${BASE}/jurisdictions`, payload);
  return data;
}

export async function updateJurisdiction(code: string, payload: UpdateJurisdictionPayload): Promise<TaxJurisdiction> {
  const { data } = await apiClient.patch(`${BASE}/jurisdictions/${code}`, payload);
  return data;
}

export async function listTaxRules(params: TaxRuleFilterParams = {}): Promise<TaxRuleListResult> {
  const { data } = await apiClient.get(`${BASE}/rules`, { params });
  return data;
}

export async function getTaxRuleById(id: string): Promise<TaxRule> {
  const { data } = await apiClient.get(`${BASE}/rules/${id}`);
  return data;
}

export async function createTaxRule(payload: CreateTaxRulePayload): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules`, payload);
  return data;
}

export async function updateTaxRule(id: string, payload: UpdateTaxRulePayload): Promise<TaxRule> {
  const { data } = await apiClient.patch(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function submitTaxRuleForApproval(id: string): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/submit`);
  return data;
}

export async function approveTaxRule(id: string): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/approve`);
  return data;
}

export async function publishTaxRule(id: string): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/publish`);
  return data;
}

export async function archiveTaxRule(id: string): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/archive`);
  return data;
}

export async function rollbackTaxRule(id: string, payload: RollbackTaxRulePayload): Promise<TaxRule> {
  const { data } = await apiClient.post(`${BASE}/rules/${id}/rollback`, payload);
  return data;
}

export async function getTaxRuleHistory(id: string): Promise<TaxRuleHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/rules/${id}/history`);
  return data;
}

export async function createTaxOverride(payload: CreateTaxOverridePayload): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`${BASE}/overrides`, payload);
  return data;
}

export async function calculateTax(payload: CalculateTaxPayload): Promise<TaxCalculationResult> {
  const { data } = await apiClient.post(`${BASE}/calculate`, payload);
  return data;
}

export async function getTaxCalculationRecords(params: TaxCalculationRecordFilterParams = {}): Promise<TaxCalculationRecordListResult> {
  const { data } = await apiClient.get(`${BASE}/calculations`, { params });
  return data;
}
