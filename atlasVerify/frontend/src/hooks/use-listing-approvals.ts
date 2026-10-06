import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as approvalsService from '@/services/listing-approvals.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { ApprovalCheckResult, CreateListingApprovalPayload, ListingApprovalFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useListingApprovals(params: ListingApprovalFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, params],
    queryFn: () => approvalsService.listListingApprovals(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useListingApproval(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, id],
    queryFn: () => approvalsService.getListingApprovalById(id as string),
    enabled: !!id,
  });
}

export function useLatestApprovalForListing(listingId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, 'listing', listingId, 'latest'],
    queryFn: () => approvalsService.getLatestApprovalForListing(listingId as string),
    enabled: !!listingId,
    retry: false,
  });
}

export function useApprovalsForListing(listingId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, 'listing', listingId],
    queryFn: () => approvalsService.getApprovalsForListing(listingId as string),
    enabled: !!listingId,
  });
}

export function useListingApprovalHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, id, 'history'],
    queryFn: () => approvalsService.getListingApprovalHistory(id as string),
    enabled: !!id,
  });
}

export function useListingApprovalStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_APPROVALS, 'stats'],
    queryFn: approvalsService.getListingApprovalStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateListingApproval() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateListingApprovalPayload) => approvalsService.createListingApproval(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_APPROVALS] });
      toast.success('Submitted for approval');
    },
    onError: () => toast.error('Could not submit for approval', 'Please try again.'),
  });
}

function invalidateApproval(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_APPROVALS] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_APPROVALS, id] });
}

export function useApproveListingApproval(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ comment, checkResults }: { comment?: string; checkResults?: ApprovalCheckResult[] }) => approvalsService.approveListingApproval(id, comment, checkResults),
    onSuccess: () => {
      invalidateApproval(queryClient, id);
      toast.success('Listing approved');
    },
    onError: () => toast.error('Could not approve listing', 'Please try again.'),
  });
}

export function useRejectListingApproval(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ reason, checkResults }: { reason: string; checkResults?: ApprovalCheckResult[] }) => approvalsService.rejectListingApproval(id, reason, checkResults),
    onSuccess: () => {
      invalidateApproval(queryClient, id);
      toast.success('Listing rejected');
    },
    onError: () => toast.error('Could not reject listing', 'Please try again.'),
  });
}

export function useRequestListingRevision(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ notes, checkResults }: { notes: string; checkResults?: ApprovalCheckResult[] }) => approvalsService.requestListingRevision(id, notes, checkResults),
    onSuccess: () => {
      invalidateApproval(queryClient, id);
      toast.success('Revision requested');
    },
    onError: () => toast.error('Could not request revision', 'Please try again.'),
  });
}

export function useResubmitListingApproval(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (comment?: string) => approvalsService.resubmitListingApproval(id, comment),
    onSuccess: () => {
      invalidateApproval(queryClient, id);
      toast.success('Resubmitted for approval');
    },
    onError: () => toast.error('Could not resubmit', 'Please try again.'),
  });
}

export function useMarkListingReadyToPublish(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (comment?: string) => approvalsService.markListingReadyToPublish(id, comment),
    onSuccess: () => {
      invalidateApproval(queryClient, id);
      toast.success('Marked ready to publish');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeleteListingApproval() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => approvalsService.deleteListingApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_APPROVALS] });
      toast.success('Approval request deleted');
    },
    onError: () => toast.error('Could not delete', 'Please try again.'),
  });
}
