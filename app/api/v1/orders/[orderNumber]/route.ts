import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, logApiCall, ApiAuthError } from '@/server/api/apiAuth';
import { BRAND } from '@/lib/brand.config';

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    const auth = await authenticateApiRequest(request, key);

    const order = await prisma.order.findFirst({
      where: { orderNumber: Number(params.orderNumber), retailerId: auth.user.id },
    });
    if (!order) throw new ApiAuthError('Order not found.', 404);

    await logApiCall(auth.apiKey.id, `/api/v1/order/${params.orderNumber}`, 'GET', 200, auth.ip);
    return NextResponse.json({
      charge: order.charge.toFixed(4),
      start_count: order.startCount != null ? String(order.startCount) : '0',
      status: order.status,
      remains: order.remains != null ? String(order.remains) : '0',
      currency: BRAND.currency.code,
    });
  } catch (err) {
    const status = err instanceof ApiAuthError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status });
  }
}
