import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as countryService from '@/services/country.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  CountryFilterParams,
  CountryProviderDomain,
  CreateCountryOverridePayload,
  CreateCountryPayload,
  ResolveCountryContextPayload,
  UpdateCountryPayload,
  UpsertProviderAvailabilityPayload,
  UpsertWorkspaceCountryConfigPayload,
  ValidateCountryCombinationPayload,
} from '@/types';

export function useCountries(params: CountryFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, params],
    queryFn: () => countryService.listCountries(params),
    staleTime: 60 * 1000,
  });
}

export function useCountryRegions() {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, 'regions'],
    queryFn: () => countryService.listRegions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCountryByCode(code: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, 'code', code],
    queryFn: () => countryService.getCountryByCode(code as string),
    enabled: !!code,
  });
}

export function useCountryById(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, id],
    queryFn: () => countryService.getCountryById(id as string),
    enabled: !!id,
  });
}

export function useCountryHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, id, 'history'],
    queryFn: () => countryService.getCountryHistory(id as string),
    enabled: !!id,
  });
}

export function useCountryProviderAvailability(
  code: string | undefined,
  params: { domain?: CountryProviderDomain; providerKey?: string; workspaceId?: string } = {},
) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, code, 'availability', params],
    queryFn: () => countryService.getCountryProviderAvailability(code as string, params),
    enabled: !!code,
  });
}

export function useWorkspaceCountryConfigs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COUNTRIES, 'workspace-config', workspaceId],
    queryFn: () => countryService.getWorkspaceCountryConfigs(workspaceId as string),
    enabled: !!workspaceId,
  });
}

function invalidateCountries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COUNTRIES] });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCountryPayload) => countryService.createCountry(payload),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Country registered');
    },
    onError: () => toast.error('Could not register country', 'Please try again.'),
  });
}

export function useUpdateCountry(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCountryPayload) => countryService.updateCountry(id, payload),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Country updated');
    },
    onError: () => toast.error('Could not update country', 'Please try again.'),
  });
}

function useCountryAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableCountry(id: string) {
  return useCountryAction(id, countryService.enableCountry, 'Country enabled');
}

export function useDisableCountry(id: string) {
  return useCountryAction(id, countryService.disableCountry, 'Country disabled');
}

export function useDeprecateCountry(id: string) {
  return useCountryAction(id, countryService.deprecateCountry, 'Country deprecated');
}

export function useArchiveCountry(id: string) {
  return useCountryAction(id, countryService.archiveCountry, 'Country archived');
}

export function useRestoreCountry(id: string) {
  return useCountryAction(id, countryService.restoreCountry, 'Country restored');
}

export function useUpsertWorkspaceCountryConfig(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpsertWorkspaceCountryConfigPayload) => countryService.upsertWorkspaceCountryConfig(workspaceId, payload),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Workspace country configuration saved');
    },
    onError: () => toast.error('Could not save configuration', 'Please try again.'),
  });
}

export function useSetDefaultWorkspaceCountry(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (countryCode: string) => countryService.setDefaultWorkspaceCountry(workspaceId, countryCode),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Default country updated');
    },
  });
}

export function useRemoveWorkspaceCountry(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (countryCode: string) => countryService.removeWorkspaceCountry(workspaceId, countryCode),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Country removed from workspace');
    },
  });
}

export function useCreateCountryOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCountryOverridePayload) => countryService.createCountryOverride(payload),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Override created');
    },
    onError: () => toast.error('Could not create override', 'Please try again.'),
  });
}

export function useConfigureCountryProviderAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpsertProviderAvailabilityPayload) => countryService.configureCountryProviderAvailability(payload),
    onSuccess: () => {
      invalidateCountries(queryClient);
      toast.success('Provider availability updated');
    },
    onError: () => toast.error('Could not update availability', 'Please try again.'),
  });
}

export function useResolveCountryContext() {
  return useMutation({
    mutationFn: (payload: ResolveCountryContextPayload) => countryService.resolveCountryContext(payload),
  });
}

export function useValidateCountryCombination() {
  return useMutation({
    mutationFn: (payload: ValidateCountryCombinationPayload) => countryService.validateCountryCombination(payload),
  });
}
