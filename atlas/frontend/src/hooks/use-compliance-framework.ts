import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as complianceService from '@/services/compliance-framework.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  ComplianceReasonPayload,
  ComplianceRecordFilterParams,
  ComplianceRuleFilterParams,
  CreateComplianceRulePayload,
  OverrideComplianceRecordPayload,
  ReviewComplianceRecordPayload,
  SubmitComplianceEvidencePayload,
  UpdateComplianceRulePayload,
  ValidateCompliancePayload,
} from '@/types';

export function useComplianceRules(params: ComplianceRuleFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RULES, params],
    queryFn: () => complianceService.listComplianceRules(params),
    staleTime: 30 * 1000,
  });
}

export function useComplianceRule(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RULES, id],
    queryFn: () => complianceService.getComplianceRuleById(id as string),
    enabled: !!id,
  });
}

export function useComplianceRuleHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RULES, id, 'history'],
    queryFn: () => complianceService.getComplianceRuleHistory(id as string),
    enabled: !!id,
  });
}

function invalidateRules(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLIANCE_RULES] });
}

export function useCreateComplianceRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateComplianceRulePayload) => complianceService.createComplianceRule(payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Compliance rule created');
    },
    onError: () => toast.error('Could not create rule', 'Please try again.'),
  });
}

export function useUpdateComplianceRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateComplianceRulePayload) => complianceService.updateComplianceRule(id, payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Compliance rule updated');
    },
    onError: () => toast.error('Could not update rule', 'Please try again.'),
  });
}

export function useActivateComplianceRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => complianceService.activateComplianceRule(id),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Rule activated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useArchiveComplianceRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ComplianceReasonPayload) => complianceService.archiveComplianceRule(id, payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Rule archived');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useValidateComplianceAction() {
  return useMutation({
    mutationFn: (payload: ValidateCompliancePayload) => complianceService.validateComplianceAction(payload),
  });
}

export function useComplianceRecords(params: ComplianceRecordFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RECORDS, params],
    queryFn: () => complianceService.listComplianceRecords(params),
    staleTime: 30 * 1000,
  });
}

export function useComplianceRecord(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RECORDS, id],
    queryFn: () => complianceService.getComplianceRecordById(id as string),
    enabled: !!id,
  });
}

export function useComplianceRecordHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RECORDS, id, 'history'],
    queryFn: () => complianceService.getComplianceRecordHistory(id as string),
    enabled: !!id,
  });
}

export function useComplianceRequirementsForSubject(subjectType: string | undefined, subjectId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.COMPLIANCE_RECORDS, 'subject', subjectType, subjectId],
    queryFn: () => complianceService.getComplianceRequirementsForSubject(subjectType as string, subjectId as string),
    enabled: !!subjectType && !!subjectId,
  });
}

function invalidateRecords(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLIANCE_RECORDS] });
}

export function useSubmitComplianceEvidence(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubmitComplianceEvidencePayload) => complianceService.submitComplianceEvidence(id, payload),
    onSuccess: () => {
      invalidateRecords(queryClient);
      toast.success('Evidence submitted');
    },
    onError: () => toast.error('Could not submit evidence', 'Please try again.'),
  });
}

export function useReviewComplianceRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ReviewComplianceRecordPayload) => complianceService.reviewComplianceRecord(id, payload),
    onSuccess: () => {
      invalidateRecords(queryClient);
      toast.success('Record reviewed');
    },
    onError: () => toast.error('Could not review record', 'Please try again.'),
  });
}

export function useWaiveComplianceRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ComplianceReasonPayload) => complianceService.waiveComplianceRecord(id, payload),
    onSuccess: () => {
      invalidateRecords(queryClient);
      toast.success('Record waived');
    },
    onError: () => toast.error('Could not waive record', 'Please try again.'),
  });
}

export function useMarkComplianceRecordNonApplicable(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ComplianceReasonPayload) => complianceService.markComplianceRecordNonApplicable(id, payload),
    onSuccess: () => {
      invalidateRecords(queryClient);
      toast.success('Record marked non-applicable');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useOverrideComplianceRecordStatus(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: OverrideComplianceRecordPayload) => complianceService.overrideComplianceRecordStatus(id, payload),
    onSuccess: () => {
      invalidateRecords(queryClient);
      toast.success('Status overridden');
    },
    onError: () => toast.error('Could not override status', 'Please try again.'),
  });
}
