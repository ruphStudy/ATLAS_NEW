import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as stockService from '@/services/inventory-stock.service';
import { QUERY_KEYS } from '@/constants';
import type { AdjustStockPayload, ChangeStockStatusPayload, ReceiveStockPayload, ReserveStockPayload, TransferStockPayload } from '@/types';
import { useToast } from './use-toast';

export function useInventoryStock(inventoryItemId: string | undefined, params: { warehouseId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId, 'stock', params],
    queryFn: () => stockService.listStock(inventoryItemId as string, params),
    enabled: !!inventoryItemId,
  });
}

export function useOnHandSummary(inventoryItemId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId, 'summary'],
    queryFn: () => stockService.getOnHandSummary(inventoryItemId as string),
    enabled: !!inventoryItemId,
  });
}

export function useInventoryTransactions(inventoryItemId: string | undefined, params: { page?: number; limit?: number; type?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId, 'transactions', params],
    queryFn: () => stockService.listTransactions(inventoryItemId as string, params),
    enabled: !!inventoryItemId,
  });
}

export function useInventoryBatches(inventoryItemId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId, 'batches'],
    queryFn: () => stockService.listBatches(inventoryItemId as string),
    enabled: !!inventoryItemId,
  });
}

export function useInventorySerials(inventoryItemId: string | undefined, params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId, 'serials', params],
    queryFn: () => stockService.listSerials(inventoryItemId as string, params),
    enabled: !!inventoryItemId,
  });
}

export function useExpiringBatches(days = 30) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, 'expiring-batches', days],
    queryFn: () => stockService.getExpiringBatches(days),
  });
}

function useStockAction<T>(inventoryItemId: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(inventoryItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReceiveStock(inventoryItemId: string) {
  return useStockAction<ReceiveStockPayload>(inventoryItemId, stockService.receiveStock, 'Stock received');
}

export function useIssueStock(inventoryItemId: string) {
  return useStockAction<ReceiveStockPayload>(inventoryItemId, stockService.issueStock, 'Stock issued');
}

export function useDispatchStock(inventoryItemId: string) {
  return useStockAction<ReceiveStockPayload>(inventoryItemId, stockService.dispatchStock, 'Stock dispatched');
}

export function useReturnStock(inventoryItemId: string) {
  return useStockAction<ReceiveStockPayload>(inventoryItemId, stockService.returnStock, 'Stock returned');
}

export function useTransferStockBetweenWarehouses(inventoryItemId: string) {
  return useStockAction<TransferStockPayload>(inventoryItemId, stockService.transferStockBetweenWarehouses, 'Stock transferred');
}

export function useAdjustStockDirect(inventoryItemId: string) {
  return useStockAction<AdjustStockPayload>(inventoryItemId, stockService.adjustStock, 'Stock adjusted');
}

export function useReserveStockDirect(inventoryItemId: string) {
  return useStockAction<ReserveStockPayload>(inventoryItemId, stockService.reserveStockDirect, 'Stock reserved');
}

export function useReleaseStockDirect(inventoryItemId: string) {
  return useStockAction<ReserveStockPayload>(inventoryItemId, stockService.releaseStockDirect, 'Stock released');
}

export function useChangeStockStatus(inventoryItemId: string) {
  return useStockAction<ChangeStockStatusPayload>(inventoryItemId, stockService.changeStockStatus, 'Stock status changed');
}

export function useReverseInventoryTransaction(inventoryItemId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) => stockService.reverseTransaction(inventoryItemId, transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS, inventoryItemId] });
      toast.success('Transaction reversed');
    },
    onError: () => toast.error('Could not reverse transaction', 'Please try again.'),
  });
}
