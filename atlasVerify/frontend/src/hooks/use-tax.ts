import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as taxService from '@/services/tax.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  CalculateTaxPayload,
  CreateJurisdictionPayload,
  CreateTaxOverridePayload,
  CreateTaxRulePayload,
  RollbackTaxRulePayload,
  TaxCalculationRecordFilterParams,
  TaxJurisdictionFilterParams,
  TaxRuleFilterParams,
  UpdateJurisdictionPayload,
  UpdateTaxRulePayload,
} from '@/types';

export function useTaxJurisdictions(params: TaxJurisdictionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_JURISDICTIONS, params],
    queryFn: () => taxService.listJurisdictions(params),
    staleTime: 60 * 1000,
  });
}

export function useTaxJurisdiction(code: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_JURISDICTIONS, code],
    queryFn: () => taxService.getJurisdictionByCode(code as string),
    enabled: !!code,
  });
}

function invalidateJurisdictions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TAX_JURISDICTIONS] });
}

export function useRegisterJurisdiction() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateJurisdictionPayload) => taxService.registerJurisdiction(payload),
    onSuccess: () => {
      invalidateJurisdictions(queryClient);
      toast.success('Jurisdiction registered');
    },
    onError: () => toast.error('Could not register jurisdiction', 'Please try again.'),
  });
}

export function useUpdateJurisdiction(code: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateJurisdictionPayload) => taxService.updateJurisdiction(code, payload),
    onSuccess: () => {
      invalidateJurisdictions(queryClient);
      toast.success('Jurisdiction updated');
    },
    onError: () => toast.error('Could not update jurisdiction', 'Please try again.'),
  });
}

export function useTaxRules(params: TaxRuleFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_RULES, params],
    queryFn: () => taxService.listTaxRules(params),
    staleTime: 30 * 1000,
  });
}

export function useTaxRule(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_RULES, id],
    queryFn: () => taxService.getTaxRuleById(id as string),
    enabled: !!id,
  });
}

export function useTaxRuleHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_RULES, id, 'history'],
    queryFn: () => taxService.getTaxRuleHistory(id as string),
    enabled: !!id,
  });
}

function invalidateTaxRules(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TAX_RULES] });
}

export function useCreateTaxRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTaxRulePayload) => taxService.createTaxRule(payload),
    onSuccess: () => {
      invalidateTaxRules(queryClient);
      toast.success('Tax rule created');
    },
    onError: () => toast.error('Could not create tax rule', 'Please try again.'),
  });
}

export function useUpdateTaxRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateTaxRulePayload) => taxService.updateTaxRule(id, payload),
    onSuccess: () => {
      invalidateTaxRules(queryClient);
      toast.success('Tax rule updated');
    },
    onError: () => toast.error('Could not update tax rule', 'Please try again.'),
  });
}

function useTaxRuleAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateTaxRules(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSubmitTaxRuleForApproval(id: string) {
  return useTaxRuleAction(id, taxService.submitTaxRuleForApproval, 'Submitted for approval');
}

export function useApproveTaxRule(id: string) {
  return useTaxRuleAction(id, taxService.approveTaxRule, 'Tax rule approved');
}

export function usePublishTaxRule(id: string) {
  return useTaxRuleAction(id, taxService.publishTaxRule, 'Tax rule published');
}

export function useArchiveTaxRule(id: string) {
  return useTaxRuleAction(id, taxService.archiveTaxRule, 'Tax rule archived');
}

export function useRollbackTaxRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackTaxRulePayload) => taxService.rollbackTaxRule(id, payload),
    onSuccess: () => {
      invalidateTaxRules(queryClient);
      toast.success('Tax rule rolled back');
    },
    onError: () => toast.error('Could not roll back rule', 'Please try again.'),
  });
}

export function useCreateTaxOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTaxOverridePayload) => taxService.createTaxOverride(payload),
    onSuccess: () => {
      invalidateTaxRules(queryClient);
      toast.success('Override created');
    },
    onError: () => toast.error('Could not create override', 'Please try again.'),
  });
}

export function useCalculateTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CalculateTaxPayload) => taxService.calculateTax(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TAX_CALCULATIONS] }),
  });
}

export function useTaxCalculationRecords(params: TaxCalculationRecordFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TAX_CALCULATIONS, params],
    queryFn: () => taxService.getTaxCalculationRecords(params),
    staleTime: 30 * 1000,
  });
}
