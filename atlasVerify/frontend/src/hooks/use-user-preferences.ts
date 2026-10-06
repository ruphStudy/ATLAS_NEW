import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as userPrefsService from '@/services/user-preferences.service';
import { getWorkspaceViewPreferences, updateWorkspaceViewPreferences } from '@/services/user-preferences.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  UpdateAiPreferencesPayload,
  UpdateAppearancePreferencesPayload,
  UpdateDefaultsPreferencesPayload,
  UpdateDisplayPreferencesPayload,
  UpdateNotificationPreferencesPayload,
  UpdateWorkspaceViewPreferencesPayload,
} from '@/types';

const WORKSPACE_VIEW_PREFS_KEY = ['user-preferences', 'workspace-view'];
const DISPLAY_PREFS_KEY = ['user-preferences', 'display'];
const NOTIFICATION_PREFS_KEY = ['user-preferences', 'notifications'];
const DEFAULTS_PREFS_KEY = ['user-preferences', 'defaults'];
const APPEARANCE_PREFS_KEY = ['user-preferences', 'appearance'];
const AI_PREFS_KEY = ['user-preferences', 'ai'];

export function useWorkspaceViewPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: WORKSPACE_VIEW_PREFS_KEY,
    queryFn: getWorkspaceViewPreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateWorkspaceViewPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWorkspaceViewPreferencesPayload) => updateWorkspaceViewPreferences(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACE_VIEW_PREFS_KEY }),
  });
}

export function useDisplayPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: DISPLAY_PREFS_KEY,
    queryFn: userPrefsService.getDisplayPreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateDisplayPreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateDisplayPreferencesPayload) => userPrefsService.updateDisplayPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPLAY_PREFS_KEY });
      toast.success('Display preferences updated');
    },
    onError: () => toast.error('Could not update preferences', 'Please try again.'),
  });
}

export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: userPrefsService.getNotificationPreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) => userPrefsService.updateNotificationPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      toast.success('Notification preferences updated');
    },
    onError: () => toast.error('Could not update preferences', 'Please try again.'),
  });
}

export function useDefaultsPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: DEFAULTS_PREFS_KEY,
    queryFn: userPrefsService.getDefaultsPreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateDefaultsPreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateDefaultsPreferencesPayload) => userPrefsService.updateDefaultsPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEFAULTS_PREFS_KEY });
      toast.success('Defaults updated');
    },
    onError: () => toast.error('Could not update defaults', 'Please try again.'),
  });
}

export function useAppearancePreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: APPEARANCE_PREFS_KEY,
    queryFn: userPrefsService.getAppearancePreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAppearancePreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAppearancePreferencesPayload) => userPrefsService.updateAppearancePreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPEARANCE_PREFS_KEY });
      toast.success('Appearance updated');
    },
    onError: () => toast.error('Could not update appearance', 'Please try again.'),
  });
}

export function useAiPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: AI_PREFS_KEY,
    queryFn: userPrefsService.getAiPreferences,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAiPreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiPreferencesPayload) => userPrefsService.updateAiPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_PREFS_KEY });
      toast.success('AI preferences updated');
    },
    onError: () => toast.error('Could not update AI preferences', 'Please try again.'),
  });
}
