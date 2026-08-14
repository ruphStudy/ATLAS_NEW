import { apiClient } from '@/lib/api/axios';
import type { UpdateUserPayload, User, UserFilterParams, UserListResult } from '@/types';

export async function listUsers(params: UserFilterParams = {}): Promise<UserListResult> {
  const { data } = await apiClient.get<UserListResult>('/users', { params });
  return data;
}

export async function getUserById(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
