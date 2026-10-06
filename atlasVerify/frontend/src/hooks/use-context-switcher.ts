import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listBrands, listBusinesses, listChannels } from '@/services/context-switcher.service';
import { QUERY_KEYS } from '@/constants';
import { useWorkspaceStore } from '@/stores';

export function useBusinesses() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setBusinesses = useWorkspaceStore((s) => s.setBusinesses);

  const query = useQuery({
    queryKey: [QUERY_KEYS.BUSINESSES, activeWorkspaceId],
    queryFn: () => listBusinesses(activeWorkspaceId as string),
    enabled: !!activeWorkspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setBusinesses(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}

export function useBrands() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setBrands = useWorkspaceStore((s) => s.setBrands);

  const query = useQuery({
    queryKey: [QUERY_KEYS.BRANDS, activeWorkspaceId],
    queryFn: () => listBrands(activeWorkspaceId as string),
    enabled: !!activeWorkspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setBrands(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}

export function useChannels() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeBusinessId = useWorkspaceStore((s) => s.activeBusinessId);
  const activeBrandId = useWorkspaceStore((s) => s.activeBrandId);
  const setChannels = useWorkspaceStore((s) => s.setChannels);

  const query = useQuery({
    queryKey: [QUERY_KEYS.CHANNELS, activeWorkspaceId, activeBusinessId, activeBrandId],
    queryFn: () => listChannels(activeWorkspaceId as string, activeBusinessId ?? undefined, activeBrandId ?? undefined),
    enabled: !!activeWorkspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setChannels(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}
