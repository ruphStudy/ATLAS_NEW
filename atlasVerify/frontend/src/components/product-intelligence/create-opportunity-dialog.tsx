'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { useCreateOpportunity } from '@/hooks';
import { useRouter } from 'next/navigation';

export function CreateOpportunityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createOpportunity = useCreateOpportunity();
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [country, setCountry] = useState('US');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!keyword || !marketplace) return;
    createOpportunity.mutate(
      { keyword, marketplace, country: country || undefined, category: category || undefined, notes: notes || undefined },
      {
        onSuccess: (opportunity) => {
          onOpenChange(false);
          router.push(`/dashboard/opportunities/${opportunity.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add an opportunity manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Keyword / product name" htmlFor="opp-keyword" required>
            <Input id="opp-keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="wireless earbuds" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Marketplace" htmlFor="opp-marketplace" required>
              <Input id="opp-marketplace" value={marketplace} onChange={(e) => setMarketplace(e.target.value.toUpperCase())} placeholder="AMAZON_US" />
            </FormField>
            <FormField label="Country" htmlFor="opp-country">
              <Input id="opp-country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={5} />
            </FormField>
          </div>
          <FormField label="Category" htmlFor="opp-category">
            <Input id="opp-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Electronics" />
          </FormField>
          <FormField label="Notes" htmlFor="opp-notes">
            <Textarea id="opp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!keyword || !marketplace || createOpportunity.isPending}>
            {createOpportunity.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
