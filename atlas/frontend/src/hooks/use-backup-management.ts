import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as backupService from '@/services/backup-management.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type { BackupJobFilterParams, BackupPolicyFilterParams, BackupRecordFilterParams, CreateBackupPolicyPayload, TriggerBackupPayload, UpdateBackupPolicyPayload } from '@/types';

export function useBackupPolicies(params: BackupPolicyFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_POLICIES, params],
    queryFn: () => backupService.listBackupPolicies(params),
    staleTime: 30 * 1000,
  });
}

export function useBackupPolicy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_POLICIES, id],
    queryFn: () => backupService.getBackupPolicyById(id as string),
    enabled: !!id,
  });
}

export function useBackupPolicyHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_POLICIES, id, 'history'],
    queryFn: () => backupService.getBackupPolicyHistory(id as string),
    enabled: !!id,
  });
}

function invalidatePolicies(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BACKUP_POLICIES] });
}

export function useCreateBackupPolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateBackupPolicyPayload) => backupService.createBackupPolicy(payload),
    onSuccess: () => {
      invalidatePolicies(queryClient);
      toast.success('Backup policy created');
    },
    onError: () => toast.error('Could not create policy', 'Please try again.'),
  });
}

export function useUpdateBackupPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateBackupPolicyPayload) => backupService.updateBackupPolicy(id, payload),
    onSuccess: () => {
      invalidatePolicies(queryClient);
      toast.success('Backup policy updated');
    },
    onError: () => toast.error('Could not update policy', 'Please try again.'),
  });
}

function usePolicyAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidatePolicies(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateBackupPolicy(id: string) {
  return usePolicyAction(id, backupService.activateBackupPolicy, 'Policy activated');
}

export function usePauseBackupPolicy(id: string) {
  return usePolicyAction(id, backupService.pauseBackupPolicy, 'Policy paused');
}

export function useArchiveBackupPolicy(id: string) {
  return usePolicyAction(id, backupService.archiveBackupPolicy, 'Policy archived');
}

export function useRestoreBackupPolicy(id: string) {
  return usePolicyAction(id, backupService.restoreBackupPolicy, 'Policy restored');
}

export function useTriggerBackup(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TriggerBackupPayload = {}) => backupService.triggerBackup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BACKUP_JOBS] });
      toast.success('Backup triggered');
    },
    onError: () => toast.error('Could not trigger backup', 'Please try again.'),
  });
}

export function useBackupJobs(params: BackupJobFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_JOBS, params],
    queryFn: () => backupService.listBackupJobs(params),
    staleTime: 15 * 1000,
  });
}

export function useBackupJob(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_JOBS, id],
    queryFn: () => backupService.getBackupJobById(id as string),
    enabled: !!id,
  });
}

export function useBackupRecords(params: BackupRecordFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_RECORDS, params],
    queryFn: () => backupService.listBackupRecords(params),
    staleTime: 30 * 1000,
  });
}

export function useAvailableBackups(targetType?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_RECORDS, 'available', targetType],
    queryFn: () => backupService.listAvailableBackups(targetType),
  });
}

export function useBackupRecord(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.BACKUP_RECORDS, id],
    queryFn: () => backupService.getBackupRecordById(id as string),
    enabled: !!id,
  });
}

export function useVerifyBackupRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => backupService.verifyBackupRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BACKUP_RECORDS] });
      toast.success('Verification started');
    },
    onError: () => toast.error('Could not verify backup', 'Please try again.'),
  });
}
