import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, logApiCall, ApiAuthError } from '@/server/api/apiAuth';
import { getRetailerPrice, getDistributorPrice } from '@/server/services/pricing.service';

/**
 * GET/POST /api/v1/services
 * Mirrors the conventional SMM-panel "services" response shape (see
 * API_DOCUMENTATION.md). Provider identity and cost price are never exposed.
 */
async function handle(request: NextRequest, key: string | null) {
  let ip = 'unknown';
  try {
    const auth = await authenticateApiRequest(request, key);
    ip = auth.ip;

    const services = await prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });

    const priced = await Promise.all(
      services.map(async (s) => {
        const price =
          auth.user.role === 'DISTRIBUTOR'
            ? await getDistributorPrice(s.id, auth.user.id)
            : await getRetailerPrice(s.id, auth.user.id);

        return {
          service: s.serviceCode,
          name: s.name,
          rate: price.toFixed(4),
          min: String(s.minQuantity),
          max: String(s.maxQuantity),
          category: s.category.name,
          type: s.serviceType,
          description: s.description ?? '',
          dripfeed: s.dripfeedEnabled,
          refill: s.refillEnabled,
          cancel: s.cancelEnabled,
        };
      }),
    );

    await logApiCall(auth.apiKey.id, '/api/v1/services', request.method, 200, ip);
    return NextResponse.json(priced);
  } catch (err) {
    const status = err instanceof ApiAuthError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status });
  }
}

export async function GET(request: NextRequest) {
  return handle(request, request.nextUrl.searchParams.get('key'));
}

export async function POST(request: NextRequest) {
  const body = await request.formData().catch(() => null);
  const key = body?.get('key')?.toString() ?? request.nextUrl.searchParams.get('key');
  return handle(request, key);
}
