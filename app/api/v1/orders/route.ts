import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  authenticateApiRequest,
  logApiCall,
  ApiAuthError,
} from '@/server/api/apiAuth';
import {
  placeOrder,
  ValidationError,
} from '@/server/services/order.service';
import crypto from 'crypto';

const createOrderSchema = z.object({
  service: z.string().min(1),
  link: z.string().url(),
  quantity: z.coerce.number().int().positive(),
  runs: z.coerce.number().int().positive().optional(),
  interval: z.coerce.number().int().positive().optional(),
  comments: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let ip = 'unknown';
  let apiKeyId: string | undefined;

  try {
    const form = await request.formData().catch(() => null);

    const params = form
      ? Object.fromEntries(form.entries())
      : Object.fromEntries(request.nextUrl.searchParams.entries());

    const key = (params.key as string) ?? null;

    const auth = await authenticateApiRequest(request, key);

    ip = auth.ip;
    apiKeyId = auth.apiKey.id;

    if (auth.user.role !== 'RETAILER') {
      throw new ApiAuthError(
        'Only retailer accounts may place orders via the API.',
        403,
      );
    }

    const parsed = createOrderSchema.safeParse(params);

    if (!parsed.success) {
      throw new ApiAuthError(
        parsed.error.issues.map((i) => i.message).join(', '),
        400,
      );
    }

    const service = await prisma.service.findUnique({
      where: {
        serviceCode: Number(parsed.data.service),
      },
    });

    if (!service) {
      throw new ApiAuthError('Service not found.', 404);
    }

    // Deterministic idempotency key from the raw request body prevents
    // duplicate charges if the client retries the exact same submission.
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(
        `${auth.user.id}:${service.id}:${parsed.data.link}:${parsed.data.quantity}:${request.headers.get('idempotency-key') ?? ''}`,
      )
      .digest('hex');

    const order = await placeOrder({
      retailerId: auth.user.id,
      serviceId: service.id,
      link: parsed.data.link,
      quantity: parsed.data.quantity,
      runs: parsed.data.runs,
      interval: parsed.data.interval,
      comments: parsed.data.comments,
      idempotencyKey: request.headers.get('idempotency-key')
        ? idempotencyKey
        : undefined,
    });

    await logApiCall(
      auth.apiKey.id,
      '/api/v1/orders',
      'POST',
      200,
      ip,
    );

    return NextResponse.json({
      order: order.orderNumber,
    });
  } catch (err) {
    if (apiKeyId) {
      await logApiCall(
        apiKeyId,
        '/api/v1/orders',
        'POST',
        400,
        ip,
      );
    }

    const status =
      err instanceof ApiAuthError
        ? err.status
        : err instanceof ValidationError
          ? 400
          : 500;

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Internal error',
      },
      { status },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    const auth = await authenticateApiRequest(request, key);

    const orders = await prisma.order.findMany({
      where: {
        retailerId: auth.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    await logApiCall(
      auth.apiKey.id,
      '/api/v1/orders',
      'GET',
      200,
      auth.ip,
    );

    return NextResponse.json(
      orders.map((o: any) => ({
        order: o.orderNumber,
        charge: o.charge.toFixed(4),
        start_count:
          o.startCount != null ? String(o.startCount) : null,
        status: o.status,
        remains:
          o.remains != null ? String(o.remains) : null,
      })),
    );
  } catch (err) {
    const status =
      err instanceof ApiAuthError ? err.status : 500;

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Internal error',
      },
      { status },
    );
  }
}