'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setRetailerPriceAction } from '@/server/actions/distributor.actions';

export function RetailerPriceRow({ retailerId, serviceId, initial }: { retailerId: string; serviceId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-end gap-2">
      <Input className="h-8 w-28" type="number" step="0.0001" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="sm" disabled={pending} onClick={() => startTransition(async () => {
        try { await setRetailerPriceAction({ retailerId, serviceId, price: parseFloat(value) }); toast.success('Price saved.'); }
        catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save price.'); }
      })}>Save</Button>
    </div>
  );
}
