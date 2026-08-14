'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label?: string;
  confirmLabel?: string;
  variant?: 'default' | 'danger';
  pending?: boolean;
  onSubmit: (reason: string) => void;
}

/** Small reusable free-text reason collector for actions whose backend DTO requires a mandatory `reason` string (cancel/reject flows across RFQ, Procurement, Purchase Order, Shipment, Quality Inspection). */
export function ReasonDialog({ open, onOpenChange, title, label = 'Reason', confirmLabel = 'Confirm', variant = 'default', pending, onSubmit }: ReasonDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason(''); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormField label={label} htmlFor="reason-dialog-input" required>
          <Textarea id="reason-dialog-input" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'default'} onClick={() => onSubmit(reason)} disabled={!reason.trim() || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
