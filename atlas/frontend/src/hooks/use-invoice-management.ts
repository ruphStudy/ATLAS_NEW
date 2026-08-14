import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as invoiceService from '@/services/invoice-management.service';
import { downloadDocumentFile } from '@/services/document-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { GenerateInvoicePayload, InvoiceFilterParams, InvoiceReasonPayload, SendInvoicePayload } from '@/types';

const INVOICE_KEY = 'invoice-management';

export function useInvoices(params: InvoiceFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [INVOICE_KEY, 'list', params],
    queryFn: () => invoiceService.listInvoices(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'detail', id],
    queryFn: () => invoiceService.getInvoice(id as string),
    enabled: !!id,
  });
}

export function useInvoiceHistory(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'history', id],
    queryFn: () => invoiceService.getInvoiceHistory(id as string),
    enabled: !!id,
  });
}

function invalidateInvoices(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [INVOICE_KEY] });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: GenerateInvoicePayload) => invoiceService.generateInvoice(payload),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice generated');
    },
    onError: () => toast.error('Could not generate invoice', 'Please try again.'),
  });
}

export function useIssueInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => invoiceService.issueInvoice(id),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice issued');
    },
    onError: () => toast.error('Could not issue invoice', 'Please try again.'),
  });
}

export function useSendInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SendInvoicePayload = {}) => invoiceService.sendInvoice(id, payload),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice sent');
    },
    onError: () => toast.error('Could not send invoice', 'Please try again.'),
  });
}

export function useVoidInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: InvoiceReasonPayload) => invoiceService.voidInvoice(id, payload),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice voided');
    },
    onError: () => toast.error('Could not void invoice', 'Please try again.'),
  });
}

export function useCancelInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: InvoiceReasonPayload) => invoiceService.cancelInvoice(id, payload),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice cancelled');
    },
    onError: () => toast.error('Could not cancel invoice', 'Please try again.'),
  });
}

export function useArchiveInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => invoiceService.archiveInvoice(id),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice archived');
    },
    onError: () => toast.error('Could not archive invoice', 'Please try again.'),
  });
}

export function useRestoreInvoice(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => invoiceService.restoreInvoice(id),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success('Invoice restored');
    },
    onError: () => toast.error('Could not restore invoice', 'Please try again.'),
  });
}

/** Records the download server-side (analytics/audit) then streams the attached document to the browser as a file save, when one is attached. */
export function useDownloadInvoice(id: string, documentId: string | null | undefined, invoiceNumber: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async () => {
      const invoice = await invoiceService.recordInvoiceDownload(id);
      if (documentId) {
        const blob = await downloadDocumentFile(documentId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoiceNumber || id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      return invoice;
    },
    onSuccess: () => {
      invalidateInvoices(queryClient);
    },
    onError: () => toast.error('Could not download invoice', 'Please try again.'),
  });
}
