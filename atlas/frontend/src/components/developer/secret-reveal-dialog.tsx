'use client';

import { Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks';

interface SecretRevealDialogProps {
  title: string;
  label: string;
  secret: string | null;
  onClose: () => void;
}

/** Surfaces a secret the backend returns exactly once (create/rotate) — never re-fetchable, so the user must copy it now. */
export function SecretRevealDialog({ title, label, secret, onClose }: SecretRevealDialogProps) {
  const toast = useToast();

  const copy = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {secret && (
          <div className="space-y-4">
            <p className="text-sm text-warning">This {label.toLowerCase()} is shown only once. Copy and store it securely — it cannot be retrieved again.</p>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary p-2 text-xs break-all">{secret}</code>
                <Button variant="outline" size="icon-sm" onClick={copy}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
