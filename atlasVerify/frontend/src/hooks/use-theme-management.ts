import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as themeService from '@/services/theme-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CreateThemePayload, RollbackThemePayload, SetActiveThemePayload, ThemeFilterParams, ThemeTokens, UpdateThemePayload } from '@/types';

const THEME_KEY = 'theme-management';

export function useEffectiveTheme() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [THEME_KEY, 'effective-theme'],
    queryFn: themeService.getEffectiveTheme,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useThemes(params: ThemeFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [THEME_KEY, 'themes', params],
    queryFn: () => themeService.listThemes(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useTheme(id: string | undefined) {
  return useQuery({
    queryKey: [THEME_KEY, 'theme', id],
    queryFn: () => themeService.getTheme(id as string),
    enabled: !!id,
  });
}

export function useThemeHistory(id: string | undefined) {
  return useQuery({
    queryKey: [THEME_KEY, 'history', id],
    queryFn: () => themeService.getThemeHistory(id as string),
    enabled: !!id,
  });
}

export function useValidateThemeTokens() {
  return useMutation({
    mutationFn: (tokens: ThemeTokens) => themeService.validateThemeTokens(tokens),
  });
}

function invalidateThemes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [THEME_KEY] });
}

export function useSetActiveTheme() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetActiveThemePayload) => themeService.setActiveTheme(payload),
    onSuccess: () => {
      invalidateThemes(queryClient);
      toast.success('Active theme updated');
    },
    onError: () => toast.error('Could not set active theme', 'Please try again.'),
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateThemePayload) => themeService.createTheme(payload),
    onSuccess: () => {
      invalidateThemes(queryClient);
      toast.success('Theme created');
    },
    onError: () => toast.error('Could not create theme', 'Please try again.'),
  });
}

export function useUpdateTheme(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateThemePayload) => themeService.updateTheme(id, payload),
    onSuccess: () => {
      invalidateThemes(queryClient);
      toast.success('Theme updated');
    },
    onError: () => toast.error('Could not update theme', 'Please try again.'),
  });
}

function useThemeAction(id: string, fn: () => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateThemes(queryClient);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePublishTheme(id: string) {
  return useThemeAction(id, () => themeService.publishTheme(id), 'Theme published');
}

export function useArchiveTheme(id: string) {
  return useThemeAction(id, () => themeService.archiveTheme(id), 'Theme archived');
}

export function useRestoreTheme(id: string) {
  return useThemeAction(id, () => themeService.restoreTheme(id), 'Theme restored');
}

export function useRollbackTheme(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackThemePayload) => themeService.rollbackTheme(id, payload),
    onSuccess: () => {
      invalidateThemes(queryClient);
      toast.success('Theme rolled back');
    },
    onError: () => toast.error('Could not roll back theme', 'Please try again.'),
  });
}
