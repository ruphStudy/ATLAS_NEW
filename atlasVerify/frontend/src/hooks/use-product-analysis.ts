import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productAnalysisService from '@/services/product-analysis.service';
import { useToast } from './use-toast';

export function useLatestProductAnalysis(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['product-analysis', opportunityId],
    queryFn: () => productAnalysisService.getLatestAnalysisForOpportunity(opportunityId as string),
    enabled: !!opportunityId,
  });
}

export function useTriggerReanalysis(opportunityId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => productAnalysisService.triggerReanalysis(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-analysis', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Re-analysis triggered');
    },
    onError: () => toast.error('Could not trigger re-analysis', 'Please try again.'),
  });
}
