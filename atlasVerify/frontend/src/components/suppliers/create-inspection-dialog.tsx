'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useCreateQualityInspection, useSuppliers } from '@/hooks';
import type { CreateQualityInspectionPayload, InspectionType, QualityInspection, SamplingMethod } from '@/types';

const TYPE_OPTIONS: { value: InspectionType; label: string }[] = [
  { value: 'PRE_PRODUCTION', label: 'Pre-production' },
  { value: 'DURING_PRODUCTION', label: 'During production' },
  { value: 'PRE_SHIPMENT', label: 'Pre-shipment' },
  { value: 'CONTAINER_LOADING', label: 'Container loading' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'IN_HOUSE', label: 'In-house' },
  { value: 'RE_INSPECTION', label: 'Re-inspection' },
];

const SAMPLING_OPTIONS: { value: SamplingMethod; label: string }[] = [
  { value: 'AQL_1_0', label: 'AQL 1.0' },
  { value: 'AQL_1_5', label: 'AQL 1.5' },
  { value: 'AQL_2_5', label: 'AQL 2.5' },
  { value: 'AQL_4_0', label: 'AQL 4.0' },
  { value: 'FULL', label: 'Full inspection' },
  { value: 'RANDOM', label: 'Random' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface CreateInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (inspection: QualityInspection) => void;
  supplierId?: string;
}

export function CreateInspectionDialog({ open, onOpenChange, onCreated, supplierId }: CreateInspectionDialogProps) {
  const createInspection = useCreateQualityInspection();
  const { data: suppliers } = useSuppliers({ limit: 100 });

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId ?? '');
  const [inspectionType, setInspectionType] = useState<InspectionType>('PRE_SHIPMENT');
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('RANDOM');
  const [quantityOrdered, setQuantityOrdered] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  const supplierOptions = (suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = () => {
    if (!quantityOrdered) return;
    const payload: CreateQualityInspectionPayload = {
      supplierId: selectedSupplierId || undefined,
      inspectionType,
      samplingMethod,
      quantityOrdered: Number(quantityOrdered),
      scheduledDate: scheduledDate || undefined,
      inspectorName: inspectorName || undefined,
    };
    createInspection.mutate(payload, {
      onSuccess: (qi) => {
        onOpenChange(false);
        setQuantityOrdered('');
        setInspectorName('');
        onCreated?.(qi);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New inspection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Supplier" htmlFor="qi-supplier">
            <Select id="qi-supplier" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} options={supplierOptions} placeholder="Select a supplier" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Inspection type" htmlFor="qi-type" required>
              <Select id="qi-type" value={inspectionType} onChange={(e) => setInspectionType(e.target.value as InspectionType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Sampling method" htmlFor="qi-sampling" required>
              <Select id="qi-sampling" value={samplingMethod} onChange={(e) => setSamplingMethod(e.target.value as SamplingMethod)} options={SAMPLING_OPTIONS} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantity ordered" htmlFor="qi-quantity" required>
              <Input id="qi-quantity" type="number" min="1" value={quantityOrdered} onChange={(e) => setQuantityOrdered(e.target.value)} />
            </FormField>
            <FormField label="Scheduled date" htmlFor="qi-scheduled">
              <Input id="qi-scheduled" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Inspector name" htmlFor="qi-inspector">
            <Input id="qi-inspector" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!quantityOrdered || createInspection.isPending}>
            {createInspection.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
