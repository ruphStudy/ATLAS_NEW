import { useQuery } from '@tanstack/react-query';
import { getAvailabilityBySku } from '@/services/inventory-availability.service';
import { useAuthStore } from '@/stores';

export function useAvailabilityBySku(sku: string | undefined) {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  return useQuery({
    queryKey: ['inventory-availability', workspaceId, sku],
    queryFn: () => getAvailabilityBySku(workspaceId as string, sku as string),
    enabled: !!workspaceId && !!sku,
  });
}
