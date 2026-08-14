import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as validationService from '@/services/ai-validation.service';
import { QUERY_KEYS } from '@/constants';
import type { CreateValidatorConfigPayload, UpdateValidatorConfigPayload, ValidateResponsePayload, ValidationFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useValidateResponse() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ValidateResponsePayload) => validationService.validateResponse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_VALIDATIONS] });
    },
    onError: () => toast.error('Validation failed', 'Please try again.'),
  });
}

export function useValidations(params: ValidationFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_VALIDATIONS, params],
    queryFn: () => validationService.listValidations(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useValidation(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_VALIDATIONS, id],
    queryFn: () => validationService.getValidationById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useValidationResults(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_VALIDATIONS, id, 'results'],
    queryFn: () => validationService.getValidationResults(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useValidationHistory(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_VALIDATIONS, id, 'history'],
    queryFn: () => validationService.getValidationHistory(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useValidationStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_VALIDATIONS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => validationService.getValidationStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useCreateValidatorConfig() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateValidatorConfigPayload) => validationService.createValidatorConfig(payload),
    onSuccess: () => toast.success('Validator config created'),
    onError: () => toast.error('Could not create validator config', 'Please try again.'),
  });
}

export function useUpdateValidatorConfig(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateValidatorConfigPayload) => validationService.updateValidatorConfig(id, payload),
    onSuccess: () => toast.success('Validator config updated'),
    onError: () => toast.error('Could not update validator config', 'Please try again.'),
  });
}

export function useDeleteValidatorConfig() {
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => validationService.deleteValidatorConfig(id),
    onSuccess: () => toast.success('Validator config deleted'),
    onError: () => toast.error('Could not delete validator config', 'Please try again.'),
  });
}

export function useValidatorConfig(id: string | undefined) {
  return useQuery({
    queryKey: ['ai-validator-config', id],
    queryFn: () => validationService.getValidatorConfigById(id as string),
    enabled: !!id,
  });
}
