import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as licenseService from '@/services/license-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  ActivateLicensePayload,
  CreateLicensePayload,
  LicenseFilterParams,
  LicenseReasonPayload,
  RenewLicensePayload,
  TransferLicensePayload,
  UpdateLicensePayload,
} from '@/types';

const LICENSE_KEY = 'license-management';

export function useLicenses(params: LicenseFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LICENSE_KEY, 'list', params],
    queryFn: () => licenseService.listLicenses(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useLicense(id: string | undefined) {
  return useQuery({
    queryKey: [LICENSE_KEY, 'detail', id],
    queryFn: () => licenseService.getLicense(id as string),
    enabled: !!id,
  });
}

export function useLicenseHistory(id: string | undefined) {
  return useQuery({
    queryKey: [LICENSE_KEY, 'history', id],
    queryFn: () => licenseService.getLicenseHistory(id as string),
    enabled: !!id,
  });
}

export function useLicenseFeature(id: string | undefined, featureKey: string | undefined) {
  return useQuery({
    queryKey: [LICENSE_KEY, 'feature', id, featureKey],
    queryFn: () => licenseService.hasLicenseFeature(id as string, featureKey as string),
    enabled: !!id && !!featureKey,
  });
}

export function useLicenseLimit(id: string | undefined, resourceKey: string | undefined) {
  return useQuery({
    queryKey: [LICENSE_KEY, 'limit', id, resourceKey],
    queryFn: () => licenseService.getLicenseLimit(id as string, resourceKey as string),
    enabled: !!id && !!resourceKey,
  });
}

function invalidateLicenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [LICENSE_KEY] });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateLicensePayload) => licenseService.createLicense(payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License created');
    },
    onError: () => toast.error('Could not create license', 'Please try again.'),
  });
}

export function useUpdateLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateLicensePayload) => licenseService.updateLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License updated');
    },
    onError: () => toast.error('Could not update license', 'Please try again.'),
  });
}

/** The response carries a signed offline token returned exactly once — callers must present it to the user for saving immediately, before the success toast dismisses. */
export function useIssueLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => licenseService.issueLicense(id),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License issued');
    },
    onError: () => toast.error('Could not issue license', 'Please try again.'),
  });
}

export function useActivateLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ActivateLicensePayload = {}) => licenseService.activateLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License activated');
    },
    onError: () => toast.error('Could not activate license', 'Please try again.'),
  });
}

export function useSuspendLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: LicenseReasonPayload = {}) => licenseService.suspendLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License suspended');
    },
    onError: () => toast.error('Could not suspend license', 'Please try again.'),
  });
}

export function useReactivateLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => licenseService.reactivateLicense(id),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License reactivated');
    },
    onError: () => toast.error('Could not reactivate license', 'Please try again.'),
  });
}

export function useRevokeLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: LicenseReasonPayload = {}) => licenseService.revokeLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License revoked');
    },
    onError: () => toast.error('Could not revoke license', 'Please try again.'),
  });
}

export function useRenewLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RenewLicensePayload) => licenseService.renewLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License renewed');
    },
    onError: () => toast.error('Could not renew license', 'Please try again.'),
  });
}

export function useTransferLicense(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TransferLicensePayload) => licenseService.transferLicense(id, payload),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License transferred');
    },
    onError: () => toast.error('Could not transfer license', 'Please try again.'),
  });
}

/** Invalidates the previous token — surface the new one to the user immediately, same as issue. */
export function useRotateLicenseKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => licenseService.rotateLicenseKey(id),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('License key rotated');
    },
    onError: () => toast.error('Could not rotate license key', 'Please try again.'),
  });
}

export function useRefreshLicenseEntitlements(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => licenseService.refreshLicenseEntitlements(id),
    onSuccess: () => {
      invalidateLicenses(queryClient);
      toast.success('Entitlements refreshed');
    },
    onError: () => toast.error('Could not refresh entitlements', 'Please try again.'),
  });
}
