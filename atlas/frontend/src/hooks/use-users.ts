import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as usersService from '@/services/users.service';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { useAuthStore } from '@/stores';
import type { UpdateUserPayload, UserFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useUsers(params: UserFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: () => usersService.listUsers(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, id],
    queryFn: () => usersService.getUserById(id as string),
    enabled: !!id,
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  const updateCurrentUser = useAuthStore((s) => s.updateUser);
  const currentUser = useAuthStore((s) => s.user);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersService.updateUser(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      // Keep the session's cached identity in sync when the user edits their own profile.
      if (currentUser?.id === updated.id) {
        updateCurrentUser({ ...currentUser, firstName: updated.firstName, lastName: updated.lastName, role: updated.role, status: updated.status });
      }
      toast.success('User updated');
    },
    onError: () => toast.error('Could not update user', 'Please try again.'),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      toast.success('User removed');
      router.push(ROUTES.USERS);
    },
    onError: () => toast.error('Could not remove user', 'Please try again.'),
  });
}
