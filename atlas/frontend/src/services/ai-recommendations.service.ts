import { apiClient } from '@/lib/api/axios';
import type {
  AcceptRecommendationPayload,
  AiRecommendation,
  AiRecommendationStats,
  CreateRecommendationStrategyPayload,
  DeferRecommendationPayload,
  DismissRecommendationPayload,
  GenerateRecommendationPayload,
  RecommendationFeedback,
  RecommendationFilterParams,
  RecommendationListResult,
  RecommendationOutcome,
  RecommendationResult,
  RecommendationStrategyConfig,
  RejectRecommendationPayload,
  SubmitRecommendationFeedbackPayload,
  TrackRecommendationOutcomePayload,
  UpdateRecommendationStrategyPayload,
} from '@/types';

const BASE = '/ai-recommendation-engine';

export async function generateRecommendation(payload: GenerateRecommendationPayload): Promise<RecommendationResult> {
  const { data } = await apiClient.post<RecommendationResult>(`${BASE}/generate`, payload);
  return data;
}

export async function listRecommendations(params: RecommendationFilterParams): Promise<RecommendationListResult> {
  const { data } = await apiClient.get<RecommendationListResult>(`${BASE}/recommendations`, { params });
  return data;
}

export async function getRecommendationById(id: string, workspaceId: string): Promise<AiRecommendation> {
  const { data } = await apiClient.get<AiRecommendation>(`${BASE}/recommendations/${id}`, { params: { workspaceId } });
  return data;
}

export async function getRecommendationItems(id: string, workspaceId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/recommendations/${id}/items`, { params: { workspaceId } });
  return data;
}

export async function getRecommendationFeedback(id: string, workspaceId: string): Promise<RecommendationFeedback[]> {
  const { data } = await apiClient.get<RecommendationFeedback[]>(`${BASE}/recommendations/${id}/feedback`, { params: { workspaceId } });
  return data;
}

export async function getRecommendationOutcomes(id: string, workspaceId: string): Promise<RecommendationOutcome[]> {
  const { data } = await apiClient.get<RecommendationOutcome[]>(`${BASE}/recommendations/${id}/outcomes`, { params: { workspaceId } });
  return data;
}

export async function acceptRecommendation(id: string, payload: AcceptRecommendationPayload): Promise<AiRecommendation> {
  const { data } = await apiClient.post<AiRecommendation>(`${BASE}/recommendations/${id}/accept`, payload);
  return data;
}

export async function rejectRecommendation(id: string, payload: RejectRecommendationPayload): Promise<AiRecommendation> {
  const { data } = await apiClient.post<AiRecommendation>(`${BASE}/recommendations/${id}/reject`, payload);
  return data;
}

export async function dismissRecommendation(id: string, payload: DismissRecommendationPayload): Promise<AiRecommendation> {
  const { data } = await apiClient.post<AiRecommendation>(`${BASE}/recommendations/${id}/dismiss`, payload);
  return data;
}

export async function deferRecommendation(id: string, payload: DeferRecommendationPayload): Promise<AiRecommendation> {
  const { data } = await apiClient.post<AiRecommendation>(`${BASE}/recommendations/${id}/defer`, payload);
  return data;
}

export async function submitRecommendationFeedback(id: string, payload: SubmitRecommendationFeedbackPayload): Promise<RecommendationFeedback> {
  const { data } = await apiClient.post<RecommendationFeedback>(`${BASE}/recommendations/${id}/feedback`, payload);
  return data;
}

export async function trackRecommendationOutcome(id: string, payload: TrackRecommendationOutcomePayload): Promise<RecommendationOutcome> {
  const { data } = await apiClient.post<RecommendationOutcome>(`${BASE}/recommendations/${id}/outcomes`, payload);
  return data;
}

export async function getRecommendationStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiRecommendationStats> {
  const { data } = await apiClient.get<AiRecommendationStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function createRecommendationStrategy(payload: CreateRecommendationStrategyPayload): Promise<RecommendationStrategyConfig> {
  const { data } = await apiClient.post<RecommendationStrategyConfig>(`${BASE}/strategies`, payload);
  return data;
}

export async function updateRecommendationStrategy(id: string, payload: UpdateRecommendationStrategyPayload): Promise<RecommendationStrategyConfig> {
  const { data } = await apiClient.patch<RecommendationStrategyConfig>(`${BASE}/strategies/${id}`, payload);
  return data;
}

export async function deleteRecommendationStrategy(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/strategies/${id}`);
}

export async function getRecommendationStrategyById(id: string): Promise<RecommendationStrategyConfig> {
  const { data } = await apiClient.get<RecommendationStrategyConfig>(`${BASE}/strategies/${id}`);
  return data;
}
