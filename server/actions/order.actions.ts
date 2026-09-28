'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/session';
import { cancelOrder } from '@/server/services/order.service';
import { recordAudit } from '@/server/services/audit.service';
import { prisma } from '@/lib/prisma';

export async function cancelOrderAction(orderId: string) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR']);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (user.role === 'DISTRIBUTOR' && order.distributorId !== user.id) {
    throw new Error('You can only manage orders for your own retailers.');
  }

  await cancelOrder(orderId, `Cancelled by ${user.role.toLowerCase()} ${user.name}.`);
  await recordAudit({ actorId: user.id, action: 'CANCEL_ORDER', entityType: 'Order', entityId: orderId });

  revalidatePath('/admin/orders');
  revalidatePath('/distributor/orders');
  revalidatePath('/retailer/orders');
}
