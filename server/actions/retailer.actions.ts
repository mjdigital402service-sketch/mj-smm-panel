'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/session';
import { placeOrderSchema } from '@/lib/validations/auth';
import {
  placeOrder,
  ValidationError,
} from '@/server/services/order.service';
import { recordAudit } from '@/server/services/audit.service';

export async function placeOrderAction(
  formData: FormData,
): Promise<
  | { ok: true; orderNumber: number }
  | { ok: false; error: string }
> {
  const user = await requireUser(['RETAILER']);

  const parsed = placeOrderSchema.safeParse({
    serviceId: formData.get('serviceId'),
    link: formData.get('link'),
    quantity: formData.get('quantity'),
    runs: formData.get('runs') || undefined,
    interval: formData.get('interval') || undefined,
    comments: formData.get('comments') || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Invalid input',
    };
  }

  /*
   * The idempotency key is supplied by the client only as a retry token.
   * The authenticated user's ID is always prepended server-side, so one
   * retailer cannot intentionally collide with another retailer's key.
   */
  const rawIdempotencyKey = String(
    formData.get('idempotencyKey') ?? '',
  ).trim();

  if (rawIdempotencyKey.length > 128) {
    return {
      ok: false,
      error: 'Invalid idempotency key.',
    };
  }

  const idempotencyKey = rawIdempotencyKey
    ? `${user.id}:${rawIdempotencyKey}`
    : undefined;

  try {
    const order = await placeOrder({
      retailerId: user.id,
      ...parsed.data,
      idempotencyKey,
    });

    /*
     * The order/wallet transaction has already completed successfully.
     * Audit failure must not make a successful order appear failed to
     * the retailer.
     */
    try {
      await recordAudit({
        actorId: user.id,
        action: 'PLACE_ORDER',
        entityType: 'Order',
        entityId: order.id,
      });
    } catch (auditError) {
      console.error(
        'PLACE_ORDER audit failed',
        auditError,
      );
    }

    revalidatePath('/retailer/orders');
    revalidatePath('/retailer/dashboard');
    revalidatePath('/retailer/wallet');

    if (order.status === 'FAILED') {
      return {
        ok: false,
        error:
          'The provider could not accept this order. You have been refunded.',
      };
    }

    return {
      ok: true,
      orderNumber: order.orderNumber,
    };
  } catch (err) {
    if (err instanceof ValidationError) {
      return {
        ok: false,
        error: err.message,
      };
    }

    console.error(
      'placeOrderAction failed',
      err,
    );

    return {
      ok: false,
      error:
        'Something went wrong while placing your order.',
    };
  }
}