import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as taskService from '@/services/task-management.service';
import { getTaskDashboard } from '@/services/task-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  AssignTaskPayload,
  CreateTaskChecklistItemPayload,
  CreateTaskPayload,
  TaskActionReasonPayload,
  TaskFilterParams,
  UpdateTaskChecklistItemPayload,
  UpdateTaskPayload,
  UpdateTaskProgressPayload,
} from '@/types';

const TASKS_KEY = 'task-management';

export function useTaskDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['task-management-dashboard'],
    queryFn: getTaskDashboard,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useTasks(params: TaskFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [TASKS_KEY, 'list', params],
    queryFn: () => taskService.listTasks(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'detail', id],
    queryFn: () => taskService.getTaskById(id as string),
    enabled: !!id,
  });
}

export function useSubtasks(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'subtasks', id],
    queryFn: () => taskService.listSubtasks(id as string),
    enabled: !!id,
  });
}

export function useTaskChecklist(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'checklist', id],
    queryFn: () => taskService.listChecklistItems(id as string),
    enabled: !!id,
  });
}

export function useTaskComments(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'comments', id],
    queryFn: () => taskService.listTaskComments(id as string),
    enabled: !!id,
  });
}

export function useTaskAttachments(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'attachments', id],
    queryFn: () => taskService.listTaskAttachments(id as string),
    enabled: !!id,
  });
}

export function useTaskWatchers(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'watchers', id],
    queryFn: () => taskService.listTaskWatchers(id as string),
    enabled: !!id,
  });
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
  queryClient.invalidateQueries({ queryKey: ['task-management-dashboard'] });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskService.createTask(payload),
    onSuccess: () => {
      invalidateTasks(queryClient);
      toast.success('Task created');
    },
    onError: () => toast.error('Could not create task', 'Please try again.'),
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => taskService.updateTask(id, payload),
    onSuccess: () => invalidateTasks(queryClient),
    onError: () => toast.error('Could not update task', 'Please try again.'),
  });
}

export function useAssignTask(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AssignTaskPayload) => taskService.assignTask(id, payload),
    onSuccess: () => {
      invalidateTasks(queryClient);
      toast.success('Task reassigned');
    },
    onError: () => toast.error('Could not assign task', 'Please try again.'),
  });
}

export function useUpdateTaskProgress(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskProgressPayload) => taskService.updateTaskProgress(id, payload),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

function useTaskLifecycleMutation(id: string, fn: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useStartTask(id: string) {
  return useTaskLifecycleMutation(id, () => taskService.startTask(id));
}

export function usePauseTask(id: string) {
  return useTaskLifecycleMutation(id, () => taskService.pauseTask(id));
}

export function useResumeTask(id: string) {
  return useTaskLifecycleMutation(id, () => taskService.resumeTask(id));
}

export function useCompleteTask(id: string) {
  return useTaskLifecycleMutation(id, () => taskService.completeTask(id));
}

export function useCancelTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskActionReasonPayload = {}) => taskService.cancelTask(id, payload),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useArchiveTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskActionReasonPayload = {}) => taskService.archiveTask(id, payload),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useRestoreTask(id: string) {
  return useTaskLifecycleMutation(id, () => taskService.restoreTask(id));
}

export function useAddChecklistItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskChecklistItemPayload) => taskService.addChecklistItem(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'checklist', id] }),
  });
}

export function useUpdateChecklistItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateTaskChecklistItemPayload }) => taskService.updateChecklistItem(id, itemId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'checklist', id] }),
  });
}

export function useRemoveChecklistItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => taskService.removeChecklistItem(id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'checklist', id] }),
  });
}

export function useAddTaskComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => taskService.addTaskComment(id, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'comments', id] }),
  });
}

export function useAddTaskWatcher(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId?: string) => taskService.addTaskWatcher(id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'watchers', id] }),
  });
}

export function useRemoveTaskWatcher(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (watcherId: string) => taskService.removeTaskWatcher(id, watcherId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY, 'watchers', id] }),
  });
}
