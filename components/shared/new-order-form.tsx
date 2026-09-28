'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { placeOrderAction } from '@/server/actions/retailer.actions';
import { formatCurrency } from '@/lib/brand.config';

export interface OrderServiceOption {
  id: string; serviceCode: number; name: string; category: string; rate: number;
  min: number; max: number; dripfeed: boolean; description: string;
}

function newKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function NewOrderForm({ services, balance }: { services: OrderServiceOption[]; balance: number }) {
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [drip, setDrip] = useState(false);
  const [pending, startTransition] = useTransition();
  const keyRef = useRef<string>(newKey());
  const formRef = useRef<HTMLFormElement>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const qty = parseInt(quantity, 10) || 0;
  const charge = service ? (service.rate * qty) / 1000 : 0;

  const grouped = useMemo(() => {
    const m = new Map<string, OrderServiceOption[]>();
    services.forEach((s) => m.set(s.category, [...(m.get(s.category) ?? []), s]));
    return Array.from(m.entries());
  }, [services]);

  function submit(fd: FormData) {
    fd.set('idempotencyKey', keyRef.current);
    startTransition(async () => {
      const res = await placeOrderAction(fd);
      if (res.ok) {
        toast.success(`Order #${res.orderNumber} placed.`);
        formRef.current?.reset();
        setServiceId(''); setQuantity(''); setDrip(false);
        keyRef.current = newKey(); // new key for the next distinct order
      } else {
        toast.error(res.error);
        // keep the same key on failure only if nothing was charged; a fresh key avoids replaying a refunded FAILED order
        keyRef.current = newKey();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>New Order</CardTitle></CardHeader>
        <CardContent>
          <form ref={formRef} action={submit} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="serviceId">Service</Label>
              <select id="serviceId" name="serviceId" required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select a service…</option>
                {grouped.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((s) => <option key={s.id} value={s.id}>{s.serviceCode} — {s.name} — {formatCurrency(s.rate)}/1000</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {service?.description && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{service.description}</p>}
            <div className="space-y-1.5"><Label htmlFor="link">Link</Label><Input id="link" name="link" type="url" placeholder="https://" required /></div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity {service && <span className="text-xs text-muted-foreground">(min {service.min} – max {service.max})</span>}</Label>
              <Input id="quantity" name="quantity" type="number" min={service?.min ?? 1} max={service?.max} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            {service?.dripfeed && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={drip} onChange={(e) => setDrip(e.target.checked)} /> Enable drip-feed</label>
                {drip && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="runs">Runs</Label><Input id="runs" name="runs" type="number" min={1} required /></div>
                    <div className="space-y-1.5"><Label htmlFor="interval">Interval (minutes)</Label><Input id="interval" name="interval" type="number" min={1} required /></div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="comments">Comments (optional)</Label><textarea id="comments" name="comments" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><Button type="submit" disabled={pending || !service}>{pending ? 'Placing order…' : 'Place Order'}</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Wallet balance</span><span className="font-medium">{formatCurrency(balance)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rate / 1000</span><span>{service ? formatCurrency(service.rate) : '—'}</span></div>
          <div className="flex justify-between border-t border-border pt-3 text-base"><span>Total</span><span className="font-semibold">{formatCurrency(charge)}</span></div>
          {service && charge > balance && <p className="text-xs text-destructive">Insufficient balance for this order.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
