import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as appStoreService from '@/services/app-store.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AppInstallationFilterParams,
  AppListingFilterParams,
  InstallAppPayload,
  PublishAppVersionPayload,
  RegisterAppListingPayload,
  RollbackAppVersionPayload,
  SubmitAppReviewPayload,
  UpdateAppInstallationPayload,
  UpdateAppListingPayload,
  UpgradeAppPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useAppListings(params: AppListingFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_LISTINGS, params],
    queryFn: () => appStoreService.listAppListings(params),
    staleTime: 30 * 1000,
  });
}

export function useAppListing(key: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_LISTINGS, key],
    queryFn: () => appStoreService.getAppListing(key as string),
    enabled: !!key,
  });
}

export function useAppListingHistory(key: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_LISTINGS, key, 'history'],
    queryFn: () => appStoreService.getAppListingHistory(key as string),
    enabled: !!key,
  });
}

export function useAppVersions(key: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_VERSIONS, key],
    queryFn: () => appStoreService.listAppVersions(key as string),
    enabled: !!key,
  });
}

export function useAppHealth(key: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_LISTINGS, key, 'health'],
    queryFn: () => appStoreService.getAppHealth(key as string),
    enabled: !!key,
  });
}

export function useRegisterPrivateApp() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterAppListingPayload) => appStoreService.registerPrivateApp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success('App registered');
    },
    onError: () => toast.error('Could not register app', 'Please try again.'),
  });
}

export function useUpdateAppListing(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAppListingPayload) => appStoreService.updateAppListing(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success('App updated');
    },
    onError: () => toast.error('Could not update app', 'Please try again.'),
  });
}

function useAppListingAction(key: string, action: (key: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSubmitAppForApproval(key: string) {
  return useAppListingAction(key, appStoreService.submitAppForApproval, 'Submitted for approval');
}

export function usePublishPrivateApp(key: string) {
  return useAppListingAction(key, appStoreService.publishPrivateApp, 'App published');
}

export function useArchiveAppListing(key: string) {
  return useAppListingAction(key, appStoreService.archiveAppListing, 'App archived');
}

export function useApproveAppListing(key: string) {
  return useAppListingAction(key, appStoreService.approveAppListing, 'App approved');
}

export function useReinstateAppListing(key: string) {
  return useAppListingAction(key, appStoreService.reinstateAppListing, 'App reinstated');
}

export function useRemoveAppListing(key: string) {
  return useAppListingAction(key, appStoreService.removeAppListing, 'App removed');
}

export function useRejectAppListing(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => appStoreService.rejectAppListing(key, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success('App rejected');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSuspendAppListing(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => appStoreService.suspendAppListing(key, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success('App suspended');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRegisterCatalogApp() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterAppListingPayload) => appStoreService.registerCatalogApp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_LISTINGS] });
      toast.success('Catalog app registered');
    },
    onError: () => toast.error('Could not register app', 'Please try again.'),
  });
}

export function usePublishAppVersion(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PublishAppVersionPayload) => appStoreService.publishAppVersion(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_VERSIONS, key] });
      toast.success('Version published');
    },
    onError: () => toast.error('Could not publish version', 'Please try again.'),
  });
}

export function useDeprecateAppVersion(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (versionId: string) => appStoreService.deprecateAppVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_VERSIONS, key] });
      toast.success('Version deprecated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAppInstallations(params: AppInstallationFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_INSTALLATIONS, params],
    queryFn: () => appStoreService.listAppInstallations(params),
    staleTime: 30 * 1000,
  });
}

export function useAppInstallation(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_INSTALLATIONS, id],
    queryFn: () => appStoreService.getAppInstallation(id as string),
    enabled: !!id,
  });
}

export function useInstallApp(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: InstallAppPayload = {}) => appStoreService.installApp(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_INSTALLATIONS] });
      toast.success('App installed');
    },
    onError: () => toast.error('Could not install app', 'Please try again.'),
  });
}

function useInstallationAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_INSTALLATIONS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useUninstallApp(id: string) {
  return useInstallationAction(id, appStoreService.uninstallApp, 'App uninstalled');
}

export function useEnableAppInstallation(id: string) {
  return useInstallationAction(id, appStoreService.enableAppInstallation, 'App enabled');
}

export function useDisableAppInstallation(id: string) {
  return useInstallationAction(id, appStoreService.disableAppInstallation, 'App disabled');
}

export function useUpgradeAppInstallation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpgradeAppPayload = {}) => appStoreService.upgradeAppInstallation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_INSTALLATIONS] });
      toast.success('App upgraded');
    },
    onError: () => toast.error('Could not upgrade app', 'Please try again.'),
  });
}

export function useRollbackAppInstallation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackAppVersionPayload) => appStoreService.rollbackAppInstallation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_INSTALLATIONS] });
      toast.success('App rolled back');
    },
    onError: () => toast.error('Could not roll back app', 'Please try again.'),
  });
}

export function useUpdateAppInstallationConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAppInstallationPayload) => appStoreService.updateAppInstallationConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_INSTALLATIONS] });
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

export function useSubmitAppReview(key: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubmitAppReviewPayload) => appStoreService.submitAppReview(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APP_REVIEWS, key] });
      toast.success('Review submitted');
    },
    onError: () => toast.error('Could not submit review', 'Please try again.'),
  });
}

export function useAppReviews(key: string | undefined, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.APP_REVIEWS, key, params],
    queryFn: () => appStoreService.listAppReviews(key as string, params),
    enabled: !!key,
  });
}
