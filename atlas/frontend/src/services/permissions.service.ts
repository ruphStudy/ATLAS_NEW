import { apiClient } from '@/lib/api/axios';
import type { EffectivePermissionsResponse } from '@/types';

export async function getEffectivePermissions(): Promise<EffectivePermissionsResponse> {
  const { data } = await apiClient.get<EffectivePermissionsResponse>('/roles-permissions/me/effective-permissions');
  return data;
}
