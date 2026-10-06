import { apiClient } from '@/lib/api/axios';
import type {
  AiResponseValidation,
  AiResponseValidationResultEntry,
  AiValidationStats,
  CreateValidatorConfigPayload,
  UpdateValidatorConfigPayload,
  ValidateResponsePayload,
  ValidationFilterParams,
  ValidationListResult,
  ValidationResult,
  ValidatorConfig,
} from '@/types';

const BASE = '/ai-response-validation';

export async function validateResponse(payload: ValidateResponsePayload): Promise<ValidationResult> {
  const { data } = await apiClient.post<ValidationResult>(`${BASE}/validate`, payload);
  return data;
}

export async function listValidations(params: ValidationFilterParams): Promise<ValidationListResult> {
  const { data } = await apiClient.get<ValidationListResult>(`${BASE}/validations`, { params });
  return data;
}

export async function getValidationById(id: string, workspaceId: string): Promise<AiResponseValidation> {
  const { data } = await apiClient.get<AiResponseValidation>(`${BASE}/validations/${id}`, { params: { workspaceId } });
  return data;
}

export async function getValidationResults(id: string, workspaceId: string): Promise<AiResponseValidationResultEntry[]> {
  const { data } = await apiClient.get<AiResponseValidationResultEntry[]>(`${BASE}/validations/${id}/results`, { params: { workspaceId } });
  return data;
}

export async function getValidationHistory(id: string, workspaceId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/validations/${id}/history`, { params: { workspaceId } });
  return data;
}

export async function getValidationStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiValidationStats> {
  const { data } = await apiClient.get<AiValidationStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function getValidatorConfigById(id: string): Promise<ValidatorConfig> {
  const { data } = await apiClient.get<ValidatorConfig>(`${BASE}/validator-configs/${id}`);
  return data;
}

export async function createValidatorConfig(payload: CreateValidatorConfigPayload): Promise<ValidatorConfig> {
  const { data } = await apiClient.post<ValidatorConfig>(`${BASE}/validator-configs`, payload);
  return data;
}

export async function updateValidatorConfig(id: string, payload: UpdateValidatorConfigPayload): Promise<ValidatorConfig> {
  const { data } = await apiClient.patch<ValidatorConfig>(`${BASE}/validator-configs/${id}`, payload);
  return data;
}

export async function deleteValidatorConfig(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/validator-configs/${id}`);
}
