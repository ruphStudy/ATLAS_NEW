import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as recommendationsService from '@/services/ai-recommendations.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AcceptRecommendationPayload,
  CreateRecommendationStrategyPayload,
  DeferRecommendationPayload,
  DismissRecommendationPayload,
  GenerateRecommendationPayload,
  RecommendationFilterParams,
  RejectRecommendationPayload,
  SubmitRecommendationFeedbackPayload,
  TrackRecommendationOutcomePayload,
  UpdateRecommendationStrategyPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useGenerateRecommendation() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: GenerateRecommendationPayload) => recommendationsService.generateRecommendation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS] });
    },
    onError: () => toast.error('Could not generate recommendation', 'Please try again.'),
  });
}

export function useRecommendations(params: RecommendationFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, params],
    queryFn: () => recommendationsService.listRecommendations(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useRecommendation(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id],
    queryFn: () => recommendationsService.getRecommendationById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRecommendationItems(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id, 'items'],
    queryFn: () => recommendationsService.getRecommendationItems(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRecommendationFeedback(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id, 'feedback'],
    queryFn: () => recommendationsService.getRecommendationFeedback(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRecommendationOutcomes(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id, 'outcomes'],
    queryFn: () => recommendationsService.getRecommendationOutcomes(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

function useRecommendationAction<T>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAcceptRecommendation(id: string) {
  return useRecommendationAction<AcceptRecommendationPayload>(id, recommendationsService.acceptRecommendation, 'Recommendation accepted');
}
export function useRejectRecommendation(id: string) {
  return useRecommendationAction<RejectRecommendationPayload>(id, recommendationsService.rejectRecommendation, 'Recommendation rejected');
}
export function useDismissRecommendation(id: string) {
  return useRecommendationAction<DismissRecommendationPayload>(id, recommendationsService.dismissRecommendation, 'Recommendation dismissed');
}
export function useDeferRecommendation(id: string) {
  return useRecommendationAction<DeferRecommendationPayload>(id, recommendationsService.deferRecommendation, 'Recommendation deferred');
}

export function useSubmitRecommendationFeedback(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubmitRecommendationFeedbackPayload) => recommendationsService.submitRecommendationFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id, 'feedback'] });
      toast.success('Feedback submitted');
    },
    onError: () => toast.error('Could not submit feedback', 'Please try again.'),
  });
}

export function useTrackRecommendationOutcome(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TrackRecommendationOutcomePayload) => recommendationsService.trackRecommendationOutcome(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, id, 'outcomes'] });
      toast.success('Outcome recorded');
    },
    onError: () => toast.error('Could not record outcome', 'Please try again.'),
  });
}

export function useRecommendationStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATIONS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => recommendationsService.getRecommendationStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useCreateRecommendationStrategy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateRecommendationStrategyPayload) => recommendationsService.createRecommendationStrategy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATION_STRATEGIES] });
      toast.success('Strategy created');
    },
    onError: () => toast.error('Could not create strategy', 'Please try again.'),
  });
}

export function useUpdateRecommendationStrategy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRecommendationStrategyPayload) => recommendationsService.updateRecommendationStrategy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATION_STRATEGIES] });
      toast.success('Strategy updated');
    },
    onError: () => toast.error('Could not update strategy', 'Please try again.'),
  });
}

export function useDeleteRecommendationStrategy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => recommendationsService.deleteRecommendationStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RECOMMENDATION_STRATEGIES] });
      toast.success('Strategy deleted');
    },
    onError: () => toast.error('Could not delete strategy', 'Please try again.'),
  });
}

export function useRecommendationStrategy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RECOMMENDATION_STRATEGIES, id],
    queryFn: () => recommendationsService.getRecommendationStrategyById(id as string),
    enabled: !!id,
  });
}
