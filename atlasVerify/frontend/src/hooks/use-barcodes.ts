import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as barcodesService from '@/services/barcodes.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { BarcodeFilterParams, CreateLabelTemplatePayload, GenerateBarcodePayload, PrintLabelPayload, ScanBarcodePayload } from '@/types';
import { useToast } from './use-toast';

export function useBarcodes(params: BarcodeFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.BARCODES, params],
    queryFn: () => barcodesService.listBarcodes(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useBarcode(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.BARCODES, id],
    queryFn: () => barcodesService.getBarcodeById(id as string),
    enabled: !!id,
  });
}

export function useLabelTemplates(params: { page?: number; limit?: number; entityType?: string } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.LABEL_TEMPLATES, params],
    queryFn: () => barcodesService.listLabelTemplates(params),
    enabled: isAuthenticated,
  });
}

export function useGenerateBarcode() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: GenerateBarcodePayload) => barcodesService.generateBarcode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BARCODES] });
      toast.success('Barcode generated');
    },
    onError: () => toast.error('Could not generate barcode', 'Please try again.'),
  });
}

export function useBulkGenerateBarcodes() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (items: GenerateBarcodePayload[]) => barcodesService.bulkGenerateBarcodes(items),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BARCODES] });
      toast.success('Barcodes generated', `${result.length} barcode(s) created.`);
    },
    onError: () => toast.error('Could not generate barcodes', 'Please try again.'),
  });
}

export function useScanBarcode() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ScanBarcodePayload) => barcodesService.scanBarcode(payload),
    onError: () => toast.error('Scan failed', 'Please try again.'),
  });
}

export function usePrintLabel() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PrintLabelPayload) => barcodesService.printLabel(payload),
    onSuccess: () => toast.success('Print job queued'),
    onError: () => toast.error('Could not print label', 'Please try again.'),
  });
}

export function useBulkPrintLabels() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ barcodeIds, templateId, labelSize }: { barcodeIds: string[]; templateId?: string; labelSize?: string }) => barcodesService.bulkPrintLabels(barcodeIds, templateId, labelSize),
    onSuccess: () => toast.success('Bulk print job queued'),
    onError: () => toast.error('Could not print labels', 'Please try again.'),
  });
}

export function useReplaceBarcode(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => barcodesService.replaceBarcode(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BARCODES] });
      toast.success('Barcode replaced');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeactivateBarcode(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => barcodesService.deactivateBarcode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BARCODES] });
      toast.success('Barcode deactivated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateLabelTemplatePayload) => barcodesService.createLabelTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LABEL_TEMPLATES] });
      toast.success('Label template created');
    },
    onError: () => toast.error('Could not create template', 'Please try again.'),
  });
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => barcodesService.deleteLabelTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LABEL_TEMPLATES] });
      toast.success('Template deleted');
    },
    onError: () => toast.error('Could not delete template', 'Please try again.'),
  });
}
