import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as orgSettingsService from '@/services/organization-settings.service';
import { getOrganizationProfile, updateOrganizationProfile } from '@/services/organization-settings.service';
import { useToast } from './use-toast';
import type {
  OrganizationSettingScopeParams,
  SettingDefinitionFilterParams,
  UpdateOrganizationOperationalPayload,
  UpdateOrganizationPolicyPayload,
  UpdateOrganizationProfilePayload,
  UpdateOrganizationRegionalPayload,
} from '@/types';

const ORG_PROFILE_QUERY_KEY = ['organization-settings', 'profile'];
const ORG_REGIONAL_QUERY_KEY = ['organization-settings', 'regional'];
const ORG_OPERATIONAL_QUERY_KEY = ['organization-settings', 'operational'];
const ORG_POLICIES_QUERY_KEY = ['organization-settings', 'policies'];

export function useOrganizationProfile(enabled = true) {
  return useQuery({
    queryKey: ORG_PROFILE_QUERY_KEY,
    queryFn: getOrganizationProfile,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganizationProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateOrganizationProfilePayload) => updateOrganizationProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_PROFILE_QUERY_KEY });
      toast.success('Organization profile updated');
    },
    onError: () => toast.error('Could not update organization profile', 'Please try again.'),
  });
}

export function useOrganizationRegional(enabled = true) {
  return useQuery({
    queryKey: ORG_REGIONAL_QUERY_KEY,
    queryFn: orgSettingsService.getOrganizationRegional,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganizationRegional() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ payload, scope }: { payload: UpdateOrganizationRegionalPayload; scope?: OrganizationSettingScopeParams }) =>
      orgSettingsService.updateOrganizationRegional(payload, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_REGIONAL_QUERY_KEY });
      toast.success('Regional settings updated');
    },
    onError: () => toast.error('Could not update regional settings', 'Please try again.'),
  });
}

export function useOrganizationOperational(enabled = true) {
  return useQuery({
    queryKey: ORG_OPERATIONAL_QUERY_KEY,
    queryFn: orgSettingsService.getOrganizationOperational,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganizationOperational() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ payload, scope }: { payload: UpdateOrganizationOperationalPayload; scope?: OrganizationSettingScopeParams }) =>
      orgSettingsService.updateOrganizationOperational(payload, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_OPERATIONAL_QUERY_KEY });
      toast.success('Operational settings updated');
    },
    onError: () => toast.error('Could not update operational settings', 'Please try again.'),
  });
}

export function useOrganizationPolicies(enabled = true) {
  return useQuery({
    queryKey: ORG_POLICIES_QUERY_KEY,
    queryFn: orgSettingsService.getOrganizationPolicies,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganizationPolicies() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ payload, scope }: { payload: UpdateOrganizationPolicyPayload; scope?: OrganizationSettingScopeParams }) =>
      orgSettingsService.updateOrganizationPolicies(payload, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_POLICIES_QUERY_KEY });
      toast.success('Policies updated');
    },
    onError: () => toast.error('Could not update policies', 'Please try again.'),
  });
}

export function useOrganizationSettingDefinitions(filter: SettingDefinitionFilterParams = {}) {
  return useQuery({
    queryKey: ['organization-settings', 'definitions', filter],
    queryFn: () => orgSettingsService.listOrganizationSettingDefinitions(filter),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationSettingHistory(key: string | undefined, scope?: OrganizationSettingScopeParams) {
  return useQuery({
    queryKey: ['organization-settings', 'history', key, scope],
    queryFn: () => orgSettingsService.getOrganizationSettingHistoryByKey(key as string, scope),
    enabled: !!key,
  });
}
