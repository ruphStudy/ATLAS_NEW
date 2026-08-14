import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as listingService from '@/services/listing.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type {
  CreateUniversalListingPayload,
  MarketplaceListingFilterParams,
  RegenerateUniversalListingPayload,
  TransformToMarketplacePayload,
  TransformToMultipleMarketplacesPayload,
  UniversalListingFilterParams,
} from '@/types';
import { useToast } from './use-toast';

export function useUniversalListings(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: ['universal-listings', catalogProductId],
    queryFn: () => listingService.getUniversalListingsByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
  });
}

export function useMarketplaceListings(universalListingId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace-listings', universalListingId],
    queryFn: () => listingService.getMarketplaceListingsByUniversalListing(universalListingId as string),
    enabled: !!universalListingId,
  });
}

export function useUniversalListingList(params: UniversalListingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, params],
    queryFn: () => listingService.listUniversalListings(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useUniversalListing(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, id],
    queryFn: () => listingService.getUniversalListingById(id as string),
    enabled: !!id,
  });
}

export function useUniversalListingHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, id, 'history'],
    queryFn: () => listingService.getUniversalListingHistory(id as string),
    enabled: !!id,
  });
}

export function useUniversalListingPreview(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, id, 'preview'],
    queryFn: () => listingService.previewUniversalListing(id as string),
    enabled: !!id,
  });
}

export function useCreateUniversalListing() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateUniversalListingPayload) => listingService.createUniversalListing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS] });
      toast.success('Listing created');
    },
    onError: () => toast.error('Could not create listing', 'Please check the form and try again.'),
  });
}

export function useRegenerateUniversalListing(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegenerateUniversalListingPayload) => listingService.regenerateUniversalListing(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, id] });
      toast.success('Listing regenerated');
    },
    onError: () => toast.error('Could not regenerate listing', 'Please try again.'),
  });
}

export function useDeleteUniversalListing() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => listingService.deleteUniversalListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS] });
      toast.success('Listing deleted');
    },
    onError: () => toast.error('Could not delete listing', 'Please try again.'),
  });
}

export function useTransformToMarketplace(universalListingId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TransformToMarketplacePayload) => listingService.transformToMarketplace(universalListingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings', universalListingId] });
      toast.success('Marketplace preview generated');
    },
    onError: () => toast.error('Could not transform listing', 'Please try again.'),
  });
}

export function useTransformToMultipleMarketplaces(universalListingId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TransformToMultipleMarketplacesPayload) => listingService.transformToMultipleMarketplaces(universalListingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings', universalListingId] });
      toast.success('Marketplace previews generated');
    },
    onError: () => toast.error('Could not transform listing', 'Please try again.'),
  });
}

export function useMarketplaceTransformationPreview(universalListingId: string | undefined, marketplaceKey: string | undefined, country?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.UNIVERSAL_LISTINGS, universalListingId, 'marketplace-preview', marketplaceKey, country],
    queryFn: () => listingService.previewMarketplaceTransformation(universalListingId as string, marketplaceKey as string, country),
    enabled: !!universalListingId && !!marketplaceKey,
  });
}

export function useMarketplaceListingList(params: MarketplaceListingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_LISTINGS_LIST, params],
    queryFn: () => listingService.listAllMarketplaceListings(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useMarketplaceListing(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_LISTINGS_LIST, id],
    queryFn: () => listingService.getMarketplaceListingById(id as string),
    enabled: !!id,
  });
}

export function useMarketplaceListingHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_LISTINGS_LIST, id, 'history'],
    queryFn: () => listingService.getMarketplaceListingHistory(id as string),
    enabled: !!id,
  });
}
