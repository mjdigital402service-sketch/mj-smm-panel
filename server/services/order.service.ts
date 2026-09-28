import { Prisma, OrderStatus } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import {
  applyWalletDelta,
  InsufficientBalanceError,
} from './wallet.service';

import { getRetailerPrice } from './pricing.service';

import {
  loadProviderContext,
  logProviderCall,
} from '../providers/registry';

import { ProviderError } from '../providers/base/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface PlaceOrderInput {
  retailerId: string;
  serviceId: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
  idempotencyKey?: string;
}

function validatePositiveInteger(
  value: number,
  fieldName: string,
) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      `${fieldName} must be a positive integer.`,
    );
  }
}

function validateOptionalPositiveInteger(
  value: number | undefined,
  fieldName: string,
) {
  if (value === undefined) return;

  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      `${fieldName} must be a positive integer.`,
    );
  }
}

function validateOptionalNonNegativeInteger(
  value: number | undefined,
  fieldName: string,
) {
  if (value === undefined) return;

  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `${fieldName} must be a non-negative integer.`,
    );
  }
}

function validateOrderLink(link: string) {
  const value = link.trim();

  if (!value) {
    throw new ValidationError('Link is required.');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ValidationError('Link must be a valid URL.');
  }

  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    throw new ValidationError(
      'Link must use HTTP or HTTPS.',
    );
  }

  return url.toString();
}

function validateIdempotencyKey(
  idempotencyKey: string | undefined,
) {
  if (idempotencyKey === undefined) return;

  const value = idempotencyKey.trim();

  if (!value) {
    throw new ValidationError(
      'Idempotency key cannot be empty.',
    );
  }

  if (value.length > 128) {
    throw new ValidationError(
      'Idempotency key is too long.',
    );
  }
}

/**
 * Places an order end-to-end:
 *
 * 1. Validate retailer, service and order parameters.
 * 2. Resolve retailer sell price.
 * 3. Atomically debit wallet + create PENDING order.
 * 4. Submit order to provider.
 * 5. On provider failure, atomically refund wallet + mark FAILED.
 *
 * Idempotency is enforced both before and during order creation.
 */
export async function placeOrder(
  input: PlaceOrderInput,
) {
  validateIdempotencyKey(input.idempotencyKey);

  const idempotencyKey =
    input.idempotencyKey?.trim() || undefined;

  validatePositiveInteger(
    input.quantity,
    'Quantity',
  );

  validateOptionalPositiveInteger(
    input.runs,
    'Runs',
  );

  validateOptionalPositiveInteger(
    input.interval,
    'Interval',
  );

  const link = validateOrderLink(input.link);

  /*
   * Fast idempotency lookup.
   *
   * This is only an optimization. The unique database constraint remains
   * the actual concurrency protection.
   */
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: {
        idempotencyKey,
      },
    });

    if (existing) {
      return existing;
    }
  }

  const [retailer, service] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: {
        id: input.retailerId,
      },
    }),

    prisma.service.findUniqueOrThrow({
      where: {
        id: input.serviceId,
      },
      include: {
        providerService: {
          include: {
            provider: true,
          },
        },
      },
    }),
  ]);

  if (retailer.role !== 'RETAILER') {
    throw new ValidationError(
      'Only retailer accounts can place orders.',
    );
  }

  if (retailer.status !== 'ACTIVE') {
    throw new ValidationError(
      'Account is not active.',
    );
  }

  if (!service.isActive) {
    throw new ValidationError(
      'Service is not currently available.',
    );
  }

  if (
    input.quantity < service.minQuantity ||
    input.quantity > service.maxQuantity
  ) {
    throw new ValidationError(
      `Quantity must be between ${service.minQuantity} and ${service.maxQuantity}.`,
    );
  }

  if (!service.providerService) {
    throw new ValidationError(
      'Service is not mapped to a provider.',
    );
  }

  const providerService =
    service.providerService;

  if (!providerService.provider.isActive) {
    throw new ValidationError(
      'The provider for this service is currently inactive.',
    );
  }

  const retailPrice = await getRetailerPrice(
    service.id,
    retailer.id,
  );

  if (retailPrice.isNegative()) {
    throw new ValidationError(
      'Invalid retailer service price.',
    );
  }

  const charge = retailPrice
    .mul(input.quantity)
    .div(1000);

  const providerCost = new Prisma.Decimal(
    service.costPrice,
  )
    .mul(input.quantity)
    .div(1000);

  const profit = charge.sub(providerCost);

  if (
    charge.isNegative() ||
    providerCost.isNegative()
  ) {
    throw new ValidationError(
      'Invalid order pricing.',
    );
  }

  /*
   * The transaction returns both:
   *
   * - order: the actual database order
   * - created: whether this request created it
   *
   * This distinction is important for idempotency.
   * An existing PENDING order must NOT be submitted to the provider
   * again by a concurrent request.
   */
  const transactionResult = await prisma.$transaction(
    async (tx) => {
      /*
       * Re-check idempotency INSIDE the transaction.
       *
       * This closes the race between two concurrent requests that both
       * passed the initial findUnique() check.
       */
      if (idempotencyKey) {
        const existing =
          await tx.order.findUnique({
            where: {
              idempotencyKey,
            },
          });

        if (existing) {
          return {
            order: existing,
            created: false,
          };
        }
      }

      await applyWalletDelta(tx, {
        userId: retailer.id,
        delta: charge.neg(),
        type: 'ORDER_DEBIT',
        description:
          `Order debit for ${service.name} x${input.quantity}`,
      });

      try {
        const createdOrder =
          await tx.order.create({
            data: {
              retailerId: retailer.id,
              distributorId: retailer.distributorId,
              serviceId: service.id,
              providerId:
                providerService.providerId,
              link,
              quantity: input.quantity,
              runs: input.runs,
              interval: input.interval,
              comments: input.comments?.trim(),
              charge,
              providerCost,
              profit,
              status: 'PENDING',
              idempotencyKey,
              statusHistory: {
                create: {
                  status: 'PENDING',
                  note:
                    'Order created, wallet debited.',
                },
              },
            },
          });

        return {
          order: createdOrder,
          created: true,
        };
      } catch (err) {
        /*
         * A concurrent request may have won the unique idempotency
         * race after our lookup. Recover by returning that order.
         */
        if (
          idempotencyKey &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const existing =
            await tx.order.findUnique({
              where: {
                idempotencyKey,
              },
            });

          if (existing) {
            /*
             * IMPORTANT:
             *
             * This request did not create the order and therefore
             * must not submit it to the provider.
             *
             * Because this transaction is rolled back when the
             * create throws, the wallet debit performed above is
             * also rolled back.
             */
            return {
              order: existing,
              created: false,
            };
          }
        }

        throw err;
      }
    },
  );

  /*
   * If another request already created this order, return it.
   *
   * This prevents duplicate provider submission even when the
   * existing order is still PENDING.
   */
  if (!transactionResult.created) {
    return transactionResult.order;
  }

  let order = transactionResult.order;

  const providerId =
    providerService.providerId;

  try {
    const { adapter, creds } =
      await loadProviderContext(providerId);

    const result = await adapter.createOrder(
      creds,
      {
        providerServiceId:
          providerService.providerServiceId,
        link,
        quantity: input.quantity,
        runs: input.runs,
        interval: input.interval,
        comments: input.comments,
      },
    );

    if (
      !result.providerOrderId ||
      !String(result.providerOrderId).trim()
    ) {
      throw new ProviderError(
        'Provider returned an invalid order ID.',
      );
    }

    await logProviderCall(
      providerId,
      'createOrder',
      true,
      {
        serviceId: service.id,
        quantity: input.quantity,
      },
      result.raw,
    );

    order = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        providerOrderId:
          String(result.providerOrderId),
        status: 'PROCESSING',
        statusHistory: {
          create: {
            status: 'PROCESSING',
            note:
              'Submitted to provider.',
          },
        },
      },
    });
  } catch (err) {
    const message =
      err instanceof ProviderError
        ? err.message
        : 'Provider order submission failed.';

    try {
      await logProviderCall(
        providerId,
        'createOrder',
        false,
        {
          serviceId: service.id,
          quantity: input.quantity,
        },
        undefined,
        message,
      );
    } catch {
      // Provider logging failure must not hide the original failure.
    }

    /*
     * Refund and FAILED transition happen atomically.
     *
     * The conditional update prevents a second concurrent compensation
     * from refunding the same order again.
     */
    await prisma.$transaction(async (tx) => {
      const claimed =
        await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING',
            providerOrderId: null,
          },
          data: {
            status: 'FAILED',
            failureReason: message,
          },
        });

      if (claimed.count !== 1) {
        /*
         * Another worker/request already changed the order.
         * Do not issue another refund.
         */
        return;
      }

      await applyWalletDelta(tx, {
        userId: retailer.id,
        delta: charge,
        type: 'REFUND',
        reference: order.id,
        description:
          `Refund: provider failed to accept order (${message})`,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'FAILED',
          note: message,
        },
      });
    });

    order = await prisma.order.findUniqueOrThrow({
      where: {
        id: order.id,
      },
    });
  }

  return order;
}

/**
 * Cancels an order.
 *
 * Local cancellation and refund are protected by a conditional state
 * transition, so concurrent cancellation cannot produce two refunds.
 */
export async function cancelOrder(
  orderId: string,
  actorNote = 'Cancelled by admin/distributor.',
) {
  if (!orderId) {
    throw new ValidationError(
      'Order ID is required.',
    );
  }

  const order =
    await prisma.order.findUniqueOrThrow({
      where: {
        id: orderId,
      },
    });

  const cancellableStatuses: OrderStatus[] = [
    'PENDING',
    'PROCESSING',
    'IN_PROGRESS',
  ];

  if (
    !cancellableStatuses.includes(
      order.status,
    )
  ) {
    throw new ValidationError(
      'Order cannot be cancelled in its current state.',
    );
  }

  /*
   * For orders already accepted by the provider, provider cancellation
   * is attempted before issuing the refund.
   *
   * If provider cancellation fails, we do NOT refund the customer,
   * because doing so could create a free provider-side order.
   */
  if (
    order.providerId &&
    order.providerOrderId
  ) {
    try {
      const { adapter, creds } =
        await loadProviderContext(
          order.providerId,
        );

      await adapter.cancelOrder(
        creds,
        order.providerOrderId,
      );

      await logProviderCall(
        order.providerId,
        'cancelOrder',
        true,
        {
          orderId,
        },
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Provider cancellation failed.';

      try {
        await logProviderCall(
          order.providerId,
          'cancelOrder',
          false,
          {
            orderId,
          },
          undefined,
          message,
        );
      } catch {
        // Logging failure must not hide provider cancellation failure.
      }

      throw new ValidationError(
        `Provider cancellation failed: ${message}`,
      );
    }
  }

  return prisma.$transaction(
    async (tx) => {
      /*
       * Atomic state claim.
       *
       * Only one concurrent cancellation can move the order from a
       * cancellable state to CANCELLED.
       */
      const claimed =
        await tx.order.updateMany({
          where: {
            id: order.id,
            status: {
              in: [
                'PENDING',
                'PROCESSING',
                'IN_PROGRESS',
              ],
            },
          },
          data: {
            status: 'CANCELLED',
          },
        });

      if (claimed.count !== 1) {
        throw new ValidationError(
          'Order cannot be cancelled in its current state.',
        );
      }

      await applyWalletDelta(tx, {
        userId: order.retailerId,
        delta: order.charge,
        type: 'REFUND',
        reference: order.id,
        description:
          'Refund for cancelled order.',
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          note: actorNote,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: {
          id: order.id,
        },
      });
    },
  );
}