import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as regionalService from '@/services/regional-settings.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CreateRegionalSettingsProfilePayload,
  RegionalSettingsProfileFilterParams,
  ResolveRegionalSettingsPayload,
  RollbackRegionalSettingsProfilePayload,
  UpdateRegionalSettingsProfilePayload,
} from '@/types';

const REGIONAL_KEY = 'regional-settings';

export function useRegionalSettingsProfiles(filter: RegionalSettingsProfileFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [REGIONAL_KEY, 'profiles', filter],
    queryFn: () => regionalService.findRegionalSettingsProfiles(filter),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useRegionalSettingsProfile(id: string | undefined) {
  return useQuery({
    queryKey: [REGIONAL_KEY, 'profile', id],
    queryFn: () => regionalService.getRegionalSettingsProfile(id as string),
    enabled: !!id,
  });
}

export function useRegionalSettingsProfileHistory(id: string | undefined) {
  return useQuery({
    queryKey: [REGIONAL_KEY, 'profile-history', id],
    queryFn: () => regionalService.getRegionalSettingsProfileHistory(id as string),
    enabled: !!id,
  });
}

export function useResolveRegionalSettings() {
  return useMutation({
    mutationFn: (payload: ResolveRegionalSettingsPayload) => regionalService.resolveRegionalSettings(payload),
  });
}

function invalidateRegional(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [REGIONAL_KEY] });
}

export function useCreateRegionalSettingsProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateRegionalSettingsProfilePayload) => regionalService.createRegionalSettingsProfile(payload),
    onSuccess: () => {
      invalidateRegional(queryClient);
      toast.success('Regional settings profile created');
    },
    onError: () => toast.error('Could not create profile', 'Please try again.'),
  });
}

export function useUpdateRegionalSettingsProfile(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRegionalSettingsProfilePayload) => regionalService.updateRegionalSettingsProfile(id, payload),
    onSuccess: () => {
      invalidateRegional(queryClient);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Could not update profile', 'Please try again.'),
  });
}

export function usePublishRegionalSettingsProfile(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => regionalService.publishRegionalSettingsProfile(id),
    onSuccess: () => {
      invalidateRegional(queryClient);
      toast.success('Profile published');
    },
  });
}

export function useArchiveRegionalSettingsProfile(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => regionalService.archiveRegionalSettingsProfile(id),
    onSuccess: () => {
      invalidateRegional(queryClient);
      toast.success('Profile archived');
    },
  });
}

export function useRollbackRegionalSettingsProfile(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackRegionalSettingsProfilePayload) => regionalService.rollbackRegionalSettingsProfile(id, payload),
    onSuccess: () => {
      invalidateRegional(queryClient);
      toast.success('Profile rolled back');
    },
    onError: () => toast.error('Could not roll back profile', 'Please try again.'),
  });
}
