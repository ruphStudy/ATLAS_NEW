import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reservationsService from '@/services/inventory-reservations.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateReservationPayload, InventoryReservationFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useInventoryReservations(params: InventoryReservationFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS, params],
    queryFn: () => reservationsService.listReservations(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryReservation(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS, id],
    queryFn: () => reservationsService.getReservationById(id as string),
    enabled: !!id,
  });
}

export function useReservationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS, id, 'history'],
    queryFn: () => reservationsService.getReservationHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateReservationPayload) => reservationsService.createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS] });
      toast.success('Reservation created');
    },
    onError: () => toast.error('Could not create reservation', 'Please try again.'),
  });
}

export function useConfirmReservation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => reservationsService.confirmReservation(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS] });
      toast.success('Reservation confirmed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReleaseReservation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ quantity, reason }: { quantity?: number; reason?: string } = {}) => reservationsService.releaseReservation(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS] });
      toast.success('Reservation released');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelReservation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => reservationsService.cancelReservation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RESERVATIONS] });
      toast.success('Reservation cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
