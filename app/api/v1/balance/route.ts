import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, logApiCall, ApiAuthError } from '@/server/api/apiAuth';
import { getWalletBalance } from '@/server/services/wallet.service';
import { BRAND } from '@/lib/brand.config';

async function handle(request: NextRequest, key: string | null) {
  try {
    const auth = await authenticateApiRequest(request, key);
    const balance = await getWalletBalance(auth.user.id);
    await logApiCall(auth.apiKey.id, '/api/v1/balance', request.method, 200, auth.ip);
    return NextResponse.json({ balance: balance.toFixed(4), currency: BRAND.currency.code });
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
