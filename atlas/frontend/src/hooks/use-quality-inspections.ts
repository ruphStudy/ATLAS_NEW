import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as qiService from '@/services/quality-inspections.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type {
  CompleteInspectionPayload,
  CreateQualityInspectionPayload,
  QualityInspectionFilterParams,
  ScheduleInspectionPayload,
  UpdateQualityInspectionPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useQualityInspections(params: QualityInspectionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS, params],
    queryFn: () => qiService.listQualityInspections(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useQualityInspection(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS, id],
    queryFn: () => qiService.getQualityInspectionById(id as string),
    enabled: !!id,
  });
}

export function useQualityInspectionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS, id, 'history'],
    queryFn: () => qiService.getInspectionHistory(id as string),
    enabled: !!id,
  });
}

export function useQualityInspectionStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS, 'stats'],
    queryFn: qiService.getQualityInspectionStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateQualityInspection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateQualityInspectionPayload) => qiService.createQualityInspection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS] });
      toast.success('Inspection created');
    },
    onError: () => toast.error('Could not create inspection', 'Please check the form and try again.'),
  });
}

export function useUpdateQualityInspection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateQualityInspectionPayload) => qiService.updateQualityInspection(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS] });
      toast.success('Inspection updated');
    },
    onError: () => toast.error('Could not update inspection', 'Please try again.'),
  });
}

function useInspectionAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS, id, 'history'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useScheduleInspection(id: string) {
  return useInspectionAction<ScheduleInspectionPayload>(id, qiService.scheduleInspection, 'Inspection scheduled');
}

export function useStartInspection(id: string) {
  return useInspectionAction<{ inspectionDate: string; inspector?: string; inspectorName?: string }>(id, qiService.startInspection, 'Inspection started');
}

export function useCompleteInspection(id: string) {
  return useInspectionAction<CompleteInspectionPayload>(id, qiService.completeInspection, 'Inspection completed');
}

export function useConditionallyApproveInspection(id: string) {
  return useInspectionAction<{ conditionsForApproval: string; notes?: string }>(id, qiService.conditionallyApproveInspection, 'Conditionally approved');
}

export function useRejectInspection(id: string) {
  return useInspectionAction<{ rejectionReason: string; notes?: string }>(id, qiService.rejectInspection, 'Inspection rejected');
}

export function useCloseInspection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => qiService.closeInspection(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS] });
      toast.success('Inspection closed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRequestReInspection(id: string) {
  return useInspectionAction<{ scheduledDate?: string; notes?: string }>(id, qiService.requestReInspection, 'Re-inspection requested');
}

export function useDeleteQualityInspection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => qiService.deleteQualityInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUALITY_INSPECTIONS] });
      toast.success('Inspection deleted');
    },
    onError: () => toast.error('Could not delete inspection', 'Please try again.'),
  });
}
