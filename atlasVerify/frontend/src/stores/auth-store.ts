import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storeSession as persistTokenCookies, clearSession as clearTokenCookies } from '@/lib/api/axios';
import type { AuthResponse, AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the initial session bootstrap (reading cookies / rehydrating) has resolved — gates the auth guard so it never redirects before we actually know. */
  isHydrated: boolean;
  setSession: (auth: AuthResponse) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      setSession: (auth) => {
        persistTokenCookies({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
        set({ user: auth.user, isAuthenticated: true });
      },
      updateUser: (user) => set({ user }),
      clearSession: () => {
        clearTokenCookies();
        set({ user: null, isAuthenticated: false });
      },
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'atlas-auth-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
