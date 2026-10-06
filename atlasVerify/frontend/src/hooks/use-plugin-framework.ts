import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pluginService from '@/services/plugin-framework.service';
import { QUERY_KEYS } from '@/constants';
import type {
  ActivatePluginPayload,
  CreatePluginEventSubscriptionPayload,
  PluginActivationFilterParams,
  PluginRequiredReasonPayload,
  RegisterPluginExtensionPointPayload,
  RegisterPluginManifestPayload,
  UpdatePluginManifestPayload,
} from '@/types';
import { useToast } from './use-toast';

export function usePluginManifests(appKey: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_MANIFESTS, appKey],
    queryFn: () => pluginService.listPluginManifests(appKey as string),
    enabled: !!appKey,
  });
}

export function useRegisterPluginManifest(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterPluginManifestPayload) => pluginService.registerPluginManifest(appKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_MANIFESTS, appKey] });
      toast.success('Manifest registered');
    },
    onError: () => toast.error('Could not register manifest', 'Please try again.'),
  });
}

export function useUpdatePluginManifest(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ versionId, payload }: { versionId: string; payload: UpdatePluginManifestPayload }) => pluginService.updatePluginManifest(appKey, versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_MANIFESTS, appKey] });
      toast.success('Manifest updated');
    },
    onError: () => toast.error('Could not update manifest', 'Please try again.'),
  });
}

export function useDeprecatePluginManifest(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (versionId: string) => pluginService.deprecatePluginManifest(appKey, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_MANIFESTS, appKey] });
      toast.success('Manifest deprecated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePluginActivations(params: PluginActivationFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS, params],
    queryFn: () => pluginService.listPluginActivations(params),
    staleTime: 30 * 1000,
  });
}

export function usePluginActivation(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS, id],
    queryFn: () => pluginService.getPluginActivation(id as string),
    enabled: !!id,
  });
}

export function usePluginActivationHealth(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS, id, 'health'],
    queryFn: () => pluginService.getPluginActivationHealth(id as string),
    enabled: !!id,
  });
}

export function usePluginActivationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS, id, 'history'],
    queryFn: () => pluginService.getPluginActivationHistory(id as string),
    enabled: !!id,
  });
}

export function useActivatePlugin(installationId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ActivatePluginPayload = {}) => pluginService.activatePlugin(installationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS] });
      toast.success('Plugin activated');
    },
    onError: () => toast.error('Could not activate plugin', 'Please try again.'),
  });
}

function usePluginActivationAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeactivatePlugin(id: string) {
  return usePluginActivationAction(id, pluginService.deactivatePlugin, 'Plugin deactivated');
}

export function useReactivatePlugin(id: string) {
  return usePluginActivationAction(id, pluginService.reactivatePlugin, 'Plugin reactivated');
}

export function useQuarantinePlugin(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PluginRequiredReasonPayload) => pluginService.quarantinePlugin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_ACTIVATIONS] });
      toast.success('Plugin quarantined');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePluginExtensionPoints(appKey: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_EXTENSION_POINTS, appKey],
    queryFn: () => pluginService.listPluginExtensionPoints(appKey as string),
    enabled: !!appKey,
  });
}

export function useRegisterPluginExtensionPoint(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterPluginExtensionPointPayload) => pluginService.registerPluginExtensionPoint(appKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_EXTENSION_POINTS, appKey] });
      toast.success('Extension point registered');
    },
    onError: () => toast.error('Could not register extension point', 'Please try again.'),
  });
}

export function useRemovePluginExtensionPoint(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (extensionPointKey: string) => pluginService.removePluginExtensionPoint(appKey, extensionPointKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_EXTENSION_POINTS, appKey] });
      toast.success('Extension point removed');
    },
    onError: () => toast.error('Could not remove extension point', 'Please try again.'),
  });
}

export function usePluginEventSubscriptions(appKey: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLUGIN_EVENT_SUBSCRIPTIONS, appKey],
    queryFn: () => pluginService.listPluginEventSubscriptions(appKey as string),
    enabled: !!appKey,
  });
}

export function useSubscribeToPluginEvent(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePluginEventSubscriptionPayload) => pluginService.subscribeToPluginEvent(appKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_EVENT_SUBSCRIPTIONS, appKey] });
      toast.success('Subscribed');
    },
    onError: () => toast.error('Could not subscribe', 'Please try again.'),
  });
}

export function useUnsubscribePluginEvent(appKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => pluginService.unsubscribePluginEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLUGIN_EVENT_SUBSCRIPTIONS, appKey] });
      toast.success('Unsubscribed');
    },
    onError: () => toast.error('Could not unsubscribe', 'Please try again.'),
  });
}
