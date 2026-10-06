import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as publicationsService from '@/services/listing-publications.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { BulkPublishPayload, PublicationFilterParams, PublishListingPayload } from '@/types';
import { useToast } from './use-toast';

export function usePublications(params: PublicationFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, params],
    queryFn: () => publicationsService.listPublications(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function usePublication(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, id],
    queryFn: () => publicationsService.getPublicationById(id as string),
    enabled: !!id,
  });
}

export function usePublicationsForListing(listingId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, 'listing', listingId],
    queryFn: () => publicationsService.getPublicationsForListing(listingId as string),
    enabled: !!listingId,
  });
}

export function usePublicationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, id, 'history'],
    queryFn: () => publicationsService.getPublicationHistory(id as string),
    enabled: !!id,
  });
}

export function usePublicationStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, 'stats'],
    queryFn: publicationsService.getPublicationStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function usePublishListing() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PublishListingPayload) => publicationsService.publishListing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS] });
      toast.success('Listing queued for publishing');
    },
    onError: () => toast.error('Could not publish listing', 'Please try again.'),
  });
}

export function useBulkPublishListings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: BulkPublishPayload) => publicationsService.bulkPublishListings(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS] });
      toast.success('Bulk publish queued', `${result.queued} queued, ${result.skipped} skipped.`);
    },
    onError: () => toast.error('Bulk publish failed', 'Please try again.'),
  });
}

function invalidatePublication(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS, id] });
}

export function useRepublishListing(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => publicationsService.republishListing(id, notes),
    onSuccess: () => {
      invalidatePublication(queryClient, id);
      toast.success('Republish queued');
    },
    onError: () => toast.error('Could not republish', 'Please try again.'),
  });
}

export function useRetryPublication(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => publicationsService.retryPublication(id, notes),
    onSuccess: () => {
      invalidatePublication(queryClient, id);
      toast.success('Retry queued');
    },
    onError: () => toast.error('Could not retry', 'Please try again.'),
  });
}

export function useUnpublishListing(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => publicationsService.unpublishListing(id, reason),
    onSuccess: () => {
      invalidatePublication(queryClient, id);
      toast.success('Listing unpublished');
    },
    onError: () => toast.error('Could not unpublish', 'Please try again.'),
  });
}

export function useArchivePublication(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => publicationsService.archivePublication(id, reason),
    onSuccess: () => {
      invalidatePublication(queryClient, id);
      toast.success('Publication archived');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeletePublication() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => publicationsService.deletePublication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LISTING_PUBLICATIONS] });
      toast.success('Publication deleted');
    },
    onError: () => toast.error('Could not delete', 'Please try again.'),
  });
}
