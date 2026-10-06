import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Business, Brand, Channel, Workspace } from '@/types';

const ACTIVE_WORKSPACE_ID_KEY = 'atlas_active_workspace_id';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  businesses: Business[];
  activeBusinessId: string | null;
  brands: Brand[];
  activeBrandId: string | null;
  channels: Channel[];
  activeChannelId: string | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspaceId: (id: string) => void;
  setBusinesses: (businesses: Business[]) => void;
  setActiveBusinessId: (id: string | null) => void;
  setBrands: (brands: Brand[]) => void;
  setActiveBrandId: (id: string | null) => void;
  setChannels: (channels: Channel[]) => void;
  setActiveChannelId: (id: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspaceId: null,
      businesses: [],
      activeBusinessId: null,
      brands: [],
      activeBrandId: null,
      channels: [],
      activeChannelId: null,

      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspaceId: (id) => {
        if (typeof window !== 'undefined') localStorage.setItem(ACTIVE_WORKSPACE_ID_KEY, id);
        set({ activeWorkspaceId: id, businesses: [], activeBusinessId: null, brands: [], activeBrandId: null, channels: [], activeChannelId: null });
      },
      setBusinesses: (businesses) => set({ businesses }),
      setActiveBusinessId: (id) => set({ activeBusinessId: id, channels: [], activeChannelId: null }),
      setBrands: (brands) => set({ brands }),
      setActiveBrandId: (id) => set({ activeBrandId: id }),
      setChannels: (channels) => set({ channels }),
      setActiveChannelId: (id) => set({ activeChannelId: id }),
      reset: () => {
        if (typeof window !== 'undefined') localStorage.removeItem(ACTIVE_WORKSPACE_ID_KEY);
        set({
          workspaces: [],
          activeWorkspaceId: null,
          businesses: [],
          activeBusinessId: null,
          brands: [],
          activeBrandId: null,
          channels: [],
          activeChannelId: null,
        });
      },
    }),
    {
      name: 'atlas-workspace-store',
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId, activeBusinessId: state.activeBusinessId, activeBrandId: state.activeBrandId, activeChannelId: state.activeChannelId }),
    },
  ),
);
