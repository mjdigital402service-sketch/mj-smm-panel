import { NextRequest, NextResponse } from 'next/server';
import { syncPendingOrders } from '@/server/services/sync.service';

/**
 * Intended to be invoked by an external scheduler (cron job, Vercel Cron,
 * systemd timer, etc.) every 1-5 minutes. Protected by CRON_SECRET so it
 * cannot be triggered by arbitrary internet traffic.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await syncPendingOrders();
  return NextResponse.json({ processed: results.length, results });
}
