import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productScoringService from '@/services/product-scoring.service';
import { useToast } from './use-toast';

export function useLatestProductScore(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['product-score', opportunityId],
    queryFn: () => productScoringService.getLatestScoreForOpportunity(opportunityId as string),
    enabled: !!opportunityId,
  });
}

export function useTriggerRescoring(opportunityId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => productScoringService.triggerRescoring(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-score', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Re-scoring triggered');
    },
    onError: () => toast.error('Could not trigger re-scoring', 'Please try again.'),
  });
}
