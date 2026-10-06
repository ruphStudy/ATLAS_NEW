'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/states';
import { CreateReceivingDialog } from './create-receiving-dialog';
import { useReceivings } from '@/hooks';

interface LinkedReceivingsProps {
  purchaseOrderId?: string;
  shipmentId?: string;
  supplierId?: string;
}

export function LinkedReceivings({ purchaseOrderId, shipmentId, supplierId }: LinkedReceivingsProps) {
  const { data } = useReceivings({ purchaseOrderId, shipmentId, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New receiving
        </Button>
      </div>

      {!data || data.items.length === 0 ? (
        <EmptyState title="No receiving records" description="Nothing has been received against this yet." className="border-none py-6" />
      ) : (
        <ul className="space-y-2">
          {data.items.map((r) => (
            <li key={r.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/receiving/${r.id}`} className="font-medium text-foreground hover:underline">
                  {r.receivingNumber}
                </Link>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Received {r.receivedQuantity} · Accepted {r.acceptedQuantity} · Rejected {r.rejectedQuantity} · Damaged {r.damagedQuantity}
              </p>
            </li>
          ))}
        </ul>
      )}

      <CreateReceivingDialog open={createOpen} onOpenChange={setCreateOpen} purchaseOrderId={purchaseOrderId} shipmentId={shipmentId} supplierId={supplierId} />
    </div>
  );
}
