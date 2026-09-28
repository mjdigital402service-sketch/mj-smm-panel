import { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { applyWalletDelta } from './wallet.service';
import { loadProviderContext, logProviderCall } from '../providers/registry';
import type { OrderStatusResult } from '../providers/base/types';

function mapProviderStatus(status: OrderStatusResult['status']): OrderStatus {
  switch (status) {
    case 'Completed':
      return 'COMPLETED';
    case 'Partial':
      return 'PARTIAL';
    case 'Canceled':
    case 'Cancelled':
      return 'CANCELLED';
    case 'Failed':
      return 'FAILED';
    case 'Processing':
      return 'PROCESSING';
    case 'In progress':
      return 'IN_PROGRESS';
    default:
      return 'PENDING';
  }
}

/**
 * Syncs all orders currently in a non-terminal state against their provider.
 * Idempotent and safe to invoke on a schedule (cron, queue worker, or the
 * /api/internal/sync-orders route) — orders already in a terminal state
 * (COMPLETED/CANCELLED/REFUNDED/FAILED) are never re-processed, and a
 * per-order advisory check prevents two concurrent sync runs from double
 * applying a refund for the same partial/cancelled transition.
 */
export async function syncPendingOrders(limit = 100) {
  const pending = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING', 'IN_PROGRESS'] }, providerOrderId: { not: null } },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  const results: { orderId: string; outcome: string }[] = [];

  for (const order of pending) {
    if (!order.providerId || !order.providerOrderId) continue;
    try {
      const { adapter, creds } = await loadProviderContext(order.providerId);
      const statusResult = await adapter.getOrderStatus(creds, order.providerOrderId);
      await logProviderCall(order.providerId, 'getOrderStatus', true, { orderId: order.id }, statusResult.raw);

      const newStatus = mapProviderStatus(statusResult.status);
      if (newStatus === order.status) {
        results.push({ orderId: order.id, outcome: 'unchanged' });
        continue;
      }

      const startCount = statusResult.startCount ? parseInt(statusResult.startCount, 10) : order.startCount;
      const remains = statusResult.remains ? parseInt(statusResult.remains, 10) : order.remains;

      // Refund the undelivered share. PARTIAL uses the provider's `remains`;
      // CANCELLED/FAILED with no `remains` reported means nothing was delivered,
      // so the whole charge is returned. The status-transition claim below
      // guarantees this happens at most once per order.
      const undelivered =
        newStatus === 'PARTIAL' ? remains ?? 0 : newStatus === 'CANCELLED' || newStatus === 'FAILED' ? remains ?? order.quantity : 0;
      const shouldRefund = undelivered > 0 && order.quantity > 0;

      const applied = await prisma.$transaction(async (tx) => {
        // Only one worker can move the order out of `order.status`; a
        // concurrent sync/cancel sees count 0 and must not refund again.
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: newStatus },
        });
        if (claimed.count !== 1) return false;

        if (shouldRefund) {
          const refundAmount = order.charge.mul(Math.min(undelivered, order.quantity)).div(order.quantity);
          await applyWalletDelta(tx, {
            userId: order.retailerId,
            delta: refundAmount,
            type: 'REFUND',
            reference: order.id,
            description: `Proportional refund for undelivered quantity (${undelivered}/${order.quantity}).`,
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            startCount: startCount ?? undefined,
            remains: remains ?? undefined,
            statusHistory: { create: { status: newStatus, note: `Synced from provider: ${statusResult.status}` } },
          },
        });
        return true;
      });

      results.push({ orderId: order.id, outcome: applied ? `updated -> ${newStatus}` : 'skipped (already processed)' });
    } catch (err) {
      await logProviderCall(order.providerId, 'getOrderStatus', false, { orderId: order.id }, undefined, (err as Error).message);
      results.push({ orderId: order.id, outcome: `error: ${(err as Error).message}` });
    }
  }

  return results;
}
