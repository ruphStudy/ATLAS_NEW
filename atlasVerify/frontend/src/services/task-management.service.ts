import { apiClient } from '@/lib/api/axios';
import type {
  AssignTaskPayload,
  CreateTaskChecklistItemPayload,
  CreateTaskPayload,
  PaginatedResult,
  Task,
  TaskActionReasonPayload,
  TaskAttachment,
  TaskChecklistItem,
  TaskComment,
  TaskDashboard,
  TaskFilterParams,
  TaskWatcher,
  UpdateTaskChecklistItemPayload,
  UpdateTaskPayload,
  UpdateTaskProgressPayload,
} from '@/types';

const BASE = '/task-management';

export async function getTaskDashboard(): Promise<TaskDashboard> {
  const { data } = await apiClient.get<TaskDashboard>(`${BASE}/dashboard`);
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks`, payload);
  return data;
}

export async function listTasks(params: TaskFilterParams = {}): Promise<PaginatedResult<Task>> {
  const { data } = await apiClient.get<PaginatedResult<Task>>(`${BASE}/tasks`, { params });
  return data;
}

export async function getTaskById(id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`${BASE}/tasks/${id}`);
  return data;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`${BASE}/tasks/${id}`, payload);
  return data;
}

export async function listSubtasks(id: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`${BASE}/tasks/${id}/subtasks`);
  return data;
}

export async function assignTask(id: string, payload: AssignTaskPayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`${BASE}/tasks/${id}/assign`, payload);
  return data;
}

export async function updateTaskProgress(id: string, payload: UpdateTaskProgressPayload): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`${BASE}/tasks/${id}/progress`, payload);
  return data;
}

export async function startTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/start`);
  return data;
}

export async function pauseTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/pause`);
  return data;
}

export async function resumeTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/resume`);
  return data;
}

export async function completeTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/complete`);
  return data;
}

export async function cancelTask(id: string, payload: TaskActionReasonPayload = {}): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/cancel`, payload);
  return data;
}

export async function archiveTask(id: string, payload: TaskActionReasonPayload = {}): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/archive`, payload);
  return data;
}

export async function restoreTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`${BASE}/tasks/${id}/restore`);
  return data;
}

export async function listChecklistItems(id: string): Promise<TaskChecklistItem[]> {
  const { data } = await apiClient.get<TaskChecklistItem[]>(`${BASE}/tasks/${id}/checklist`);
  return data;
}

export async function addChecklistItem(id: string, payload: CreateTaskChecklistItemPayload): Promise<TaskChecklistItem> {
  const { data } = await apiClient.post<TaskChecklistItem>(`${BASE}/tasks/${id}/checklist`, payload);
  return data;
}

export async function updateChecklistItem(id: string, itemId: string, payload: UpdateTaskChecklistItemPayload): Promise<TaskChecklistItem> {
  const { data } = await apiClient.patch<TaskChecklistItem>(`${BASE}/tasks/${id}/checklist/${itemId}`, payload);
  return data;
}

export async function removeChecklistItem(id: string, itemId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tasks/${id}/checklist/${itemId}`);
}

export async function listTaskComments(id: string): Promise<TaskComment[]> {
  const { data } = await apiClient.get<TaskComment[]>(`${BASE}/tasks/${id}/comments`);
  return data;
}

export async function addTaskComment(id: string, comment: string): Promise<TaskComment> {
  const { data } = await apiClient.post<TaskComment>(`${BASE}/tasks/${id}/comments`, { comment });
  return data;
}

export async function listTaskAttachments(id: string): Promise<TaskAttachment[]> {
  const { data } = await apiClient.get<TaskAttachment[]>(`${BASE}/tasks/${id}/attachments`);
  return data;
}

export async function addTaskAttachment(id: string, fileId: string): Promise<TaskAttachment> {
  const { data } = await apiClient.post<TaskAttachment>(`${BASE}/tasks/${id}/attachments`, { fileId });
  return data;
}

export async function removeTaskAttachment(id: string, attachmentId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tasks/${id}/attachments/${attachmentId}`);
}

export async function listTaskWatchers(id: string): Promise<TaskWatcher[]> {
  const { data } = await apiClient.get<TaskWatcher[]>(`${BASE}/tasks/${id}/watchers`);
  return data;
}

export async function addTaskWatcher(id: string, userId?: string): Promise<TaskWatcher> {
  const { data } = await apiClient.post<TaskWatcher>(`${BASE}/tasks/${id}/watchers`, { userId });
  return data;
}

export async function removeTaskWatcher(id: string, watcherId: string): Promise<void> {
  await apiClient.delete(`${BASE}/tasks/${id}/watchers/${watcherId}`);
}
