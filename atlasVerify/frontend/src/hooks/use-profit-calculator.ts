import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profitCalculatorService from '@/services/profit-calculator.service';
import type { CreateProfitCalculationPayload } from '@/types';
import { useToast } from './use-toast';

export function useLatestProfitCalculation(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['profit-calculation', opportunityId],
    queryFn: () => profitCalculatorService.getLatestProfitCalculationForOpportunity(opportunityId as string),
    enabled: !!opportunityId,
  });
}

export function useCreateProfitCalculation(opportunityId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Omit<CreateProfitCalculationPayload, 'opportunityId'>) => profitCalculatorService.createProfitCalculation({ ...payload, opportunityId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-calculation', opportunityId] });
      toast.success('Profit calculated');
    },
    onError: () => toast.error('Could not calculate profit', 'Please check the inputs and try again.'),
  });
}
