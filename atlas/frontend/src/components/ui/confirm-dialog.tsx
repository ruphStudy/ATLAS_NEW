'use client';

import { AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';

/** Global confirm-dialog host — rendered once in `providers/providers.tsx`, driven by `useUIStore`'s `pendingConfirm`. Trigger via `const confirm = useConfirm(); const ok = await confirm({ title, description, variant: 'danger' });` */
export function ConfirmDialogHost() {
  const pending = useUIStore((s) => s.pendingConfirm);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && resolveConfirm(false)}>
      <DialogContent size="sm" hideClose>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {pending?.variant === 'danger' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle className="h-4.5 w-4.5 text-danger" />
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle>{pending?.title}</DialogTitle>
              {pending?.description && <DialogDescription className="mt-1">{pending.description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => resolveConfirm(false)}>
            {pending?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={pending?.variant === 'danger' ? 'danger' : 'default'} onClick={() => resolveConfirm(true)}>
            {pending?.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
