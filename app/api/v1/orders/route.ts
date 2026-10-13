
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
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
import { InsufficientBalanceError } from '@/server/services/wallet.service';
import { ProviderError } from '@/server/providers/base/types';

const createOrderSchema = z.object({
  service: z.string().min(1),
  link: z.string().url(),
  quantity: z.coerce.number().int().positive(),
  runs: z.coerce.number().int().positive().optional(),
  interval: z.coerce.number().int().positive().optional(),
  comments: z.string().optional(),
});

type ApiErrorResponse = {
  status: number;
  body: {
    error: string;
    errorId?: string;
  };
};

function logUnexpectedError(
  context: 'POST' | 'GET',
  errorId: string,
  err: unknown,
) {
  // Server-side diagnostics only. Never return this information to API clients.
  // Avoid logging request data, API keys, provider raw responses, or credentials.
  if (err instanceof Error) {
    console.error(`[API v1 orders] Unexpected ${context} error`, {
      errorId,
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  console.error(`[API v1 orders] Unexpected ${context} error`, {
    errorId,
    errorType: typeof err,
  });
}

function getPostErrorResponse(err: unknown): ApiErrorResponse {
  if (err instanceof ApiAuthError) {
    return {
      status: err.status,
      body: { error: err.message },
    };
  }

  if (err instanceof ValidationError) {
    return {
      status: 400,
      body: { error: err.message },
    };
  }

  if (err instanceof InsufficientBalanceError) {
    return {
      status: 402,
      body: { error: err.message },
    };
  }

  if (err instanceof ProviderError) {
    const errorId = crypto.randomUUID();

    // Provider messages and raw responses can contain sensitive information.
    console.error('[API v1 orders] Provider error', {
      errorId,
      errorType: 'ProviderError',
      retryable: err.retryable,
    });

    return {
      status: err.retryable ? 503 : 502,
      body: {
        error: 'The service provider could not process this order.',
        errorId,
      },
    };
  }

  const errorId = crypto.randomUUID();
  logUnexpectedError('POST', errorId, err);

  return {
    status: 500,
    body: {
      error: 'An unexpected server error occurred. Please try again later.',
      errorId,
    },
  };
}

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
        parsed.error.issues.map((issue) => issue.message).join(', '),
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

    const requestIdempotencyKey = request.headers.get('idempotency-key');
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(
        `${auth.user.id}:${service.id}:${parsed.data.link}:${parsed.data.quantity}:${requestIdempotencyKey ?? ''}`,
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
      idempotencyKey: requestIdempotencyKey ? idempotencyKey : undefined,
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
    const result = getPostErrorResponse(err);

    if (apiKeyId) {
      await logApiCall(
        apiKeyId,
        '/api/v1/orders',
        'POST',
        result.status,
        ip,
      );
    }

    return NextResponse.json(result.body, {
      status: result.status,
    });
  }
}

export async function GET(request: NextRequest) {
  let apiKeyId: string | undefined;
  let ip = 'unknown';

  try {
    const key = request.nextUrl.searchParams.get('key');
    const auth = await authenticateApiRequest(request, key);

    apiKeyId = auth.apiKey.id;
    ip = auth.ip;

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
      orders.map((order) => ({
        order: order.orderNumber,
        charge: order.charge.toFixed(4),
        start_count:
          order.startCount != null ? String(order.startCount) : null,
        status: order.status,
        remains:
          order.remains != null ? String(order.remains) : null,
      })),
    );
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }

    const errorId = crypto.randomUUID();
    logUnexpectedError('GET', errorId, err);

    if (apiKeyId) {
      await logApiCall(
        apiKeyId,
        '/api/v1/orders',
        'GET',
        500,
        ip,
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected server error occurred. Please try again later.',
        errorId,
      },
      { status: 500 },
    );
  }
}
