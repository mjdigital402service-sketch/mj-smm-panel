'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deletePricingRuleAction } from '@/server/actions/payment.actions';

export function PricingRuleDelete({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deletePricingRuleAction(id);
          toast.success('Rule removed.');
        })
      }
    >
      Remove
    </Button>
  );
}
