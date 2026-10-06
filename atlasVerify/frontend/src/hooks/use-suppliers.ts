import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as suppliersService from '@/services/suppliers.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateSupplierPayload, SupplierFilterParams, UpdateSupplierPayload, UpdateSupplierStatusPayload } from '@/types';
import { useToast } from './use-toast';

export function useSuppliers(params: SupplierFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIERS, params],
    queryFn: () => suppliersService.listSuppliers(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIERS, id],
    queryFn: () => suppliersService.getSupplierById(id as string),
    enabled: !!id,
  });
}

export function useSupplierStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIERS, 'stats'],
    queryFn: suppliersService.getSupplierStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => suppliersService.createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
      toast.success('Supplier created');
    },
    onError: () => toast.error('Could not create supplier', 'Please check the form and try again.'),
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSupplierPayload) => suppliersService.updateSupplier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
      toast.success('Supplier updated');
    },
    onError: () => toast.error('Could not update supplier', 'Please try again.'),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => suppliersService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
      toast.success('Supplier deleted');
    },
    onError: () => toast.error('Could not delete supplier', 'Please try again.'),
  });
}

export function useUpdateSupplierStatus(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSupplierStatusPayload) => suppliersService.updateSupplierStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIERS, id, 'status-history'] });
      toast.success('Supplier status updated');
    },
    onError: () => toast.error('Could not update status', 'Please try again.'),
  });
}

export function useSupplierStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIERS, id, 'status-history'],
    queryFn: () => suppliersService.getSupplierStatusHistory(id as string),
    enabled: !!id,
  });
}

export function useSupplierProfileHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIERS, id, 'profile-history'],
    queryFn: () => suppliersService.getSupplierProfileHistory(id as string),
    enabled: !!id,
  });
}
