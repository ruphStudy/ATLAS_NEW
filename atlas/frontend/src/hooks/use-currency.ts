import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as currencyService from '@/services/currency.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  ConfigureProviderPriorityPayload,
  ConvertAmountPayload,
  CreateCurrencyPayload,
  CurrencyFilterParams,
  ExchangeRateFilterParams,
  RecordRatePayload,
  RefreshRateFromProviderPayload,
  RejectRatePayload,
  ResolveRateWithFallbackPayload,
  UpdateCurrencyPayload,
  UpdateRatePayload,
  UpsertWorkspaceCurrencyConfigPayload,
} from '@/types';

export function useCurrencies(params: CurrencyFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES, params],
    queryFn: () => currencyService.listCurrencies(params),
    staleTime: 60 * 1000,
  });
}

export function useCurrencyByCode(code: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES, 'code', code],
    queryFn: () => currencyService.getCurrencyByCode(code as string),
    enabled: !!code,
  });
}

export function useCurrencyById(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES, id],
    queryFn: () => currencyService.getCurrencyById(id as string),
    enabled: !!id,
  });
}

export function useCurrencyHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES, id, 'history'],
    queryFn: () => currencyService.getCurrencyHistory(id as string),
    enabled: !!id,
  });
}

export function useWorkspaceCurrencyConfig(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.CURRENCIES, 'workspace-config', workspaceId],
    queryFn: () => currencyService.getWorkspaceCurrencyConfig(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useExchangeRates(params: ExchangeRateFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXCHANGE_RATES, params],
    queryFn: () => currencyService.getRateHistory(params),
    staleTime: 30 * 1000,
  });
}

export function useExchangeRate(rateId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXCHANGE_RATES, rateId],
    queryFn: () => currencyService.getRate(rateId as string),
    enabled: !!rateId,
  });
}

export function useExchangeRateProviderPriorities(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXCHANGE_RATE_PROVIDERS, workspaceId],
    queryFn: () => currencyService.getProviderPriorities(workspaceId),
    staleTime: 60 * 1000,
  });
}

function invalidateCurrencies(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CURRENCIES] });
}

function invalidateRates(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXCHANGE_RATES] });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCurrencyPayload) => currencyService.createCurrency(payload),
    onSuccess: () => {
      invalidateCurrencies(queryClient);
      toast.success('Currency registered');
    },
    onError: () => toast.error('Could not register currency', 'Please try again.'),
  });
}

export function useUpdateCurrency(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCurrencyPayload) => currencyService.updateCurrency(id, payload),
    onSuccess: () => {
      invalidateCurrencies(queryClient);
      toast.success('Currency updated');
    },
    onError: () => toast.error('Could not update currency', 'Please try again.'),
  });
}

function useCurrencyAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateCurrencies(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableCurrency(id: string) {
  return useCurrencyAction(id, currencyService.enableCurrency, 'Currency enabled');
}

export function useDisableCurrency(id: string) {
  return useCurrencyAction(id, currencyService.disableCurrency, 'Currency disabled');
}

export function useArchiveCurrency(id: string) {
  return useCurrencyAction(id, currencyService.archiveCurrency, 'Currency archived');
}

export function useRestoreCurrency(id: string) {
  return useCurrencyAction(id, currencyService.restoreCurrency, 'Currency restored');
}

export function useUpsertWorkspaceCurrencyConfig(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpsertWorkspaceCurrencyConfigPayload) => currencyService.upsertWorkspaceCurrencyConfig(workspaceId, payload),
    onSuccess: () => {
      invalidateCurrencies(queryClient);
      toast.success('Workspace currency configuration saved');
    },
    onError: () => toast.error('Could not save configuration', 'Please try again.'),
  });
}

export function useRecordManualRate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordRatePayload) => currencyService.recordManualRate(payload),
    onSuccess: () => {
      invalidateRates(queryClient);
      toast.success('Rate recorded');
    },
    onError: () => toast.error('Could not record rate', 'Please try again.'),
  });
}

export function useRefreshRateFromProvider() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RefreshRateFromProviderPayload) => currencyService.refreshRateFromProvider(payload),
    onSuccess: () => {
      invalidateRates(queryClient);
      toast.success('Rate synced from provider');
    },
    onError: () => toast.error('Could not sync rate', 'Please try again.'),
  });
}

export function useResolveRateWithFallback() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ResolveRateWithFallbackPayload) => currencyService.resolveRateWithFallback(payload),
    onSuccess: () => invalidateRates(queryClient),
    onError: () => toast.error('Could not resolve rate', 'Please try again.'),
  });
}

export function useUpdateRate(rateId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRatePayload) => currencyService.updateRate(rateId, payload),
    onSuccess: () => {
      invalidateRates(queryClient);
      toast.success('Rate updated');
    },
    onError: () => toast.error('Could not update rate', 'Please try again.'),
  });
}

function useRateAction(rateId: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(rateId),
    onSuccess: () => {
      invalidateRates(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveRate(rateId: string) {
  return useRateAction(rateId, currencyService.approveRate, 'Rate approved');
}

export function usePublishRate(rateId: string) {
  return useRateAction(rateId, currencyService.publishRate, 'Rate published');
}

export function useArchiveRateRecord(rateId: string) {
  return useRateAction(rateId, currencyService.archiveRateRecord, 'Rate archived');
}

export function useRejectRate(rateId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RejectRatePayload) => currencyService.rejectRate(rateId, payload),
    onSuccess: () => {
      invalidateRates(queryClient);
      toast.success('Rate rejected');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useConfigureProviderPriority() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ConfigureProviderPriorityPayload) => currencyService.configureProviderPriority(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXCHANGE_RATE_PROVIDERS] });
      toast.success('Provider priority configured');
    },
    onError: () => toast.error('Could not configure priority', 'Please try again.'),
  });
}

export function useConvertAmount() {
  return useMutation({
    mutationFn: (payload: ConvertAmountPayload) => currencyService.convertAmount(payload),
  });
}
