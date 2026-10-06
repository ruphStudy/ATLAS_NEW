import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as businessService from '@/services/multi-business.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  ChangeBusinessOwnershipPayload,
  CreateMultiBusinessPayload,
  LinkBusinessEntityPayload,
  MultiBusinessFilterParams,
  SetParentBusinessPayload,
  UpdateMultiBusinessPayload,
} from '@/types';

export function useMultiBusinesses(params: MultiBusinessFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BUSINESSES, params],
    queryFn: () => businessService.listMultiBusinesses(params),
    staleTime: 30 * 1000,
  });
}

export function useMultiBusiness(id: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BUSINESSES, id, workspaceId],
    queryFn: () => businessService.getBusinessById(id as string, workspaceId),
    enabled: !!id,
  });
}

export function useMultiBusinessChildren(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BUSINESSES, id, 'children'],
    queryFn: () => businessService.getBusinessChildren(id as string),
    enabled: !!id,
  });
}

export function useMultiBusinessHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BUSINESSES, id, 'history'],
    queryFn: () => businessService.getBusinessHistory(id as string),
    enabled: !!id,
  });
}

export function useMultiBusinessLinks(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BUSINESSES, id, 'links'],
    queryFn: () => businessService.listBusinessLinks(id as string),
    enabled: !!id,
  });
}

function invalidateBusinesses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BUSINESSES] });
}

export function useCreateMultiBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMultiBusinessPayload) => businessService.createBusiness(payload),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success('Business created');
    },
    onError: () => toast.error('Could not create business', 'Please try again.'),
  });
}

export function useUpdateMultiBusiness(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateMultiBusinessPayload) => businessService.updateBusiness(id, payload),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success('Business updated');
    },
    onError: () => toast.error('Could not update business', 'Please try again.'),
  });
}

function useBusinessAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateMultiBusiness(id: string) {
  return useBusinessAction(id, businessService.activateBusiness, 'Business activated');
}

export function useSuspendMultiBusiness(id: string) {
  return useBusinessAction(id, businessService.suspendBusiness, 'Business suspended');
}

export function useArchiveMultiBusiness(id: string) {
  return useBusinessAction(id, businessService.archiveBusiness, 'Business archived');
}

export function useRestoreMultiBusiness(id: string) {
  return useBusinessAction(id, businessService.restoreBusiness, 'Business restored');
}

export function useSetDefaultMultiBusiness(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => businessService.setDefaultBusiness(id),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success('Default business updated');
    },
  });
}

export function useSetParentBusiness(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetParentBusinessPayload) => businessService.setParentBusiness(id, payload),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success('Parent business updated');
    },
    onError: () => toast.error('Could not update hierarchy', 'Please try again.'),
  });
}

export function useChangeBusinessOwnership(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ChangeBusinessOwnershipPayload) => businessService.changeBusinessOwnership(id, payload),
    onSuccess: () => {
      invalidateBusinesses(queryClient);
      toast.success('Ownership updated');
    },
    onError: () => toast.error('Could not change ownership', 'Please try again.'),
  });
}

export function useLinkBusinessEntity(businessId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: LinkBusinessEntityPayload) => businessService.linkBusinessEntity(businessId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BUSINESSES, businessId, 'links'] });
      toast.success('Entity linked');
    },
    onError: () => toast.error('Could not link entity', 'Please try again.'),
  });
}

export function useUnlinkBusinessEntity(businessId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) => businessService.unlinkBusinessEntity(businessId, entityType, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BUSINESSES, businessId, 'links'] });
      toast.success('Entity unlinked');
    },
    onError: () => toast.error('Could not unlink entity', 'Please try again.'),
  });
}
