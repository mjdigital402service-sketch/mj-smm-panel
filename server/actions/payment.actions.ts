'use server';

import crypto from 'crypto';
import { Prisma, WalletTxType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { applyWalletDelta } from '@/server/services/wallet.service';
import { notify } from '@/server/services/notification.service';
import { recordAudit } from '@/server/services/audit.service';

function parsePositiveAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a valid amount.');
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function assertEnumValue(
  value: string,
  allowed: readonly string[],
  fieldName: string,
): void {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }
}

function parseOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  const text = cleanString(value);

  if (!text) {
    return undefined;
  }

  if (text.length > maxLength) {
    throw new Error(
      `Value is too long. Maximum ${maxLength} characters.`,
    );
  }

  return text;
}

function getEncryptionKey(): Buffer {
  const rawKey = cleanString(
    process.env.ENCRYPTION_KEY,
  );

  if (!rawKey) {
    throw new Error(
      'ENCRYPTION_KEY is not configured.',
    );
  }

  const key = Buffer.from(
    rawKey,
    'base64',
  );

  if (key.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY must be a valid base64-encoded 32-byte key.',
    );
  }

  return key;
}

/**
 * AES-256-GCM encryption.
 *
 * Stored format:
 * base64(iv):base64(authTag):base64(ciphertext)
 */
function encryptSecret(value: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    key,
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

async function getQrCodeDataUrl(
  value: unknown,
): Promise<string | undefined> {
  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  const allowedTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
  ]);

  if (!allowedTypes.has(value.type)) {
    throw new Error(
      'QR code must be a PNG, JPEG or WEBP image.',
    );
  }

  const maxSize = 1024 * 1024;

  if (value.size > maxSize) {
    throw new Error(
      'QR code image must be smaller than 1 MB.',
    );
  }

  const bytes = Buffer.from(
    await value.arrayBuffer(),
  );

  if (bytes.length === 0) {
    return undefined;
  }

  if (bytes.length > maxSize) {
    throw new Error(
      'QR code image must be smaller than 1 MB.',
    );
  }

  return `data:${value.type};base64,${bytes.toString(
    'base64',
  )}`;
}

function buildPaymentMethodConfig(
  formData: FormData,
  type: string,
  qrCodeDataUrl?: string,
): Prisma.InputJsonObject {
  const config: Record<
    string,
    Prisma.InputJsonValue
  > = {};

  const accountName = parseOptionalText(
    formData.get('accountName'),
    150,
  );

  const instructions = parseOptionalText(
    formData.get('instructions'),
    1000,
  );

  if (accountName) {
    config.accountName = accountName;
  }

  if (instructions) {
    config.instructions = instructions;
  }

  if (qrCodeDataUrl) {
    config.qrCodeDataUrl = qrCodeDataUrl;
  }

  if (type === 'UPI') {
    const upiId = parseOptionalText(
      formData.get('upiId'),
      200,
    );

    if (!upiId) {
      throw new Error(
        'UPI ID is required for a UPI payment method.',
      );
    }

    config.upiId = upiId;
  }

  if (type === 'BANK_TRANSFER') {
    const bankAccountName =
      parseOptionalText(
        formData.get('bankAccountName'),
        150,
      );

    const bankName = parseOptionalText(
      formData.get('bankName'),
      150,
    );

    const accountNumber =
      parseOptionalText(
        formData.get('accountNumber'),
        100,
      );

    const ifsc = parseOptionalText(
      formData.get('ifsc'),
      50,
    );

    const bankInstructions =
      parseOptionalText(
        formData.get('bankInstructions'),
        1000,
      );

    if (!bankAccountName) {
      throw new Error(
        'Account holder name is required for bank transfer.',
      );
    }

    if (!bankName) {
      throw new Error(
        'Bank name is required for bank transfer.',
      );
    }

    if (!accountNumber) {
      throw new Error(
        'Account number is required for bank transfer.',
      );
    }

    if (!ifsc) {
      throw new Error(
        'IFSC code is required for bank transfer.',
      );
    }

    config.bankAccountName =
      bankAccountName;
    config.bankName = bankName;
    config.accountNumber = accountNumber;
    config.ifsc = ifsc;

    if (bankInstructions) {
      config.bankInstructions =
        bankInstructions;
    }
  }

  if (type === 'GATEWAY') {
    const gatewayName =
      parseOptionalText(
        formData.get('gatewayName'),
        100,
      );

    const merchantId =
      parseOptionalText(
        formData.get('merchantId'),
        200,
      );

    const apiKey =
      parseOptionalText(
        formData.get('apiKey'),
        1000,
      );

    const secretKey =
      parseOptionalText(
        formData.get('secretKey'),
        1000,
      );

    const webhookSecret =
      parseOptionalText(
        formData.get('webhookSecret'),
        1000,
      );

    const gatewayMode = cleanString(
      formData.get('gatewayMode') ??
        'TEST',
    );

    assertEnumValue(
      gatewayMode,
      ['TEST', 'LIVE'],
      'gateway mode',
    );

    if (!gatewayName) {
      throw new Error(
        'Gateway name is required for a payment gateway.',
      );
    }

    if (!merchantId) {
      throw new Error(
        'Merchant ID is required for a payment gateway.',
      );
    }

    if (!apiKey) {
      throw new Error(
        'API key is required for a payment gateway.',
      );
    }

    if (!secretKey) {
      throw new Error(
        'Secret key is required for a payment gateway.',
      );
    }

    config.gatewayName = gatewayName;
    config.merchantId = merchantId;
    config.gatewayMode = gatewayMode;

    config.gatewayCredentialsEncrypted = {
      apiKey: encryptSecret(apiKey),
      secretKey: encryptSecret(secretKey),
      ...(webhookSecret
        ? {
            webhookSecret:
              encryptSecret(
                webhookSecret,
              ),
          }
        : {}),
    };
  }

  if (type === 'MANUAL') {
    const manualInstructions =
      parseOptionalText(
        formData.get(
          'manualInstructions',
        ),
        1000,
      );

    if (manualInstructions) {
      config.manualInstructions =
        manualInstructions;
    }
  }

  return config as Prisma.InputJsonObject;
}

export async function submitPaymentRequestAction(
  formData: FormData,
) {
  const user = await requireUser([
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const amount = parsePositiveAmount(
    formData.get('amount'),
  );

  const paymentMethodId = cleanString(
    formData.get('paymentMethodId'),
  );

  const transactionRefRaw =
    cleanString(
      formData.get('transactionRef'),
    );

  const transactionRef =
    transactionRefRaw || undefined;

  if (!paymentMethodId) {
    throw new Error(
      'Select a payment method.',
    );
  }

  if (
    transactionRef &&
    transactionRef.length > 200
  ) {
    throw new Error(
      'Transaction reference is too long.',
    );
  }

  const paymentMethod =
    await prisma.paymentMethod.findUnique(
      {
        where: {
          id: paymentMethodId,
        },
        select: {
          id: true,
          isActive: true,
        },
      },
    );

  if (!paymentMethod) {
    throw new Error(
      'Payment method not found.',
    );
  }

  if (!paymentMethod.isActive) {
    throw new Error(
      'This payment method is currently unavailable.',
    );
  }

  await prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      paymentMethodId,
      transactionRef,
      status: 'PENDING',
    },
  });

  revalidatePath(
    '/distributor/wallet',
  );
  revalidatePath(
    '/retailer/wallet',
  );
  revalidatePath(
    '/admin/payments',
  );
}

export async function reviewPaymentAction(
  paymentId: string,
  approve: boolean,
  notes?: string,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const normalizedPaymentId =
    cleanString(paymentId);

  if (!normalizedPaymentId) {
    throw new Error(
      'Invalid payment ID.',
    );
  }

  const normalizedNotes =
    cleanString(notes).slice(0, 1000) ||
    undefined;

  const result =
    await prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.findUnique({
            where: {
              id: normalizedPaymentId,
            },
            select: {
              id: true,
              userId: true,
              amount: true,
              transactionRef: true,
              status: true,
            },
          });

        if (!payment) {
          throw new Error(
            'Payment request not found.',
          );
        }

        if (
          payment.status !== 'PENDING'
        ) {
          throw new Error(
            'This payment has already been reviewed.',
          );
        }

        const claimed =
          await tx.payment.updateMany(
            {
              where: {
                id: payment.id,
                status: 'PENDING',
              },
              data: {
                status: approve
                  ? 'APPROVED'
                  : 'REJECTED',
                reviewedById: admin.id,
                reviewedAt: new Date(),
                notes: normalizedNotes,
              },
            },
          );

        if (claimed.count !== 1) {
          throw new Error(
            'This payment has already been reviewed.',
          );
        }

        if (approve) {
          await applyWalletDelta(
            tx,
            {
              userId: payment.userId,
              delta: payment.amount,
              type: WalletTxType.PAYMENT,
              reference: payment.id,
              description:
                `Payment approved (ref: ${
                  payment.transactionRef ??
                  payment.id
                })`,
            },
          );
        }

        return payment;
      },
    );

  try {
    if (approve) {
      await notify({
        userId: result.userId,
        type: 'PAYMENT_APPROVED',
        title: 'Payment approved',
        message:
          `Your payment of ${result.amount.toFixed(
            2,
          )} has been approved and credited.`,
      });
    } else {
      await notify({
        userId: result.userId,
        type: 'PAYMENT_REJECTED',
        title: 'Payment rejected',
        message:
          normalizedNotes ||
          'Your payment request was rejected.',
      });
    }
  } catch (notificationError) {
    console.error(
      'Payment notification failed',
      notificationError,
    );
  }

  try {
    await recordAudit({
      actorId: admin.id,
      action: approve
        ? 'APPROVE_PAYMENT'
        : 'REJECT_PAYMENT',
      entityType: 'Payment',
      entityId: normalizedPaymentId,
    });
  } catch (auditError) {
    console.error(
      'Payment review audit failed',
      auditError,
    );
  }

  revalidatePath('/admin/payments');
  revalidatePath('/admin/dashboard');
  revalidatePath('/distributor/wallet');
  revalidatePath('/retailer/wallet');
}

export async function createPaymentMethodAction(
  formData: FormData,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const name = cleanString(
    formData.get('name'),
  );

  const type = cleanString(
    formData.get('type') ??
      'MANUAL',
  );

  if (!name) {
    throw new Error(
      'Payment method name is required.',
    );
  }

  if (name.length > 100) {
    throw new Error(
      'Payment method name is too long.',
    );
  }

  assertEnumValue(
    type,
    [
      'UPI',
      'BANK_TRANSFER',
      'GATEWAY',
      'MANUAL',
    ],
    'payment method type',
  );

  const qrCodeDataUrl =
    await getQrCodeDataUrl(
      formData.get('qrCode'),
    );

  const config =
    buildPaymentMethodConfig(
      formData,
      type,
      qrCodeDataUrl,
    );

  const paymentMethod =
    await prisma.paymentMethod.create({
      data: {
        name,
        type: type as
          | 'UPI'
          | 'BANK_TRANSFER'
          | 'GATEWAY'
          | 'MANUAL',
        config,
      },
    });

  try {
    await recordAudit({
      actorId: admin.id,
      action:
        'CREATE_PAYMENT_METHOD',
      entityType: 'PaymentMethod',
      entityId: paymentMethod.id,
    });
  } catch (auditError) {
    console.error(
      'CREATE_PAYMENT_METHOD audit failed',
      auditError,
    );
  }

  revalidatePath(
    '/admin/payments',
  );
}

/**
 * Activate / deactivate a payment method.
 *
 * Deactivation is preferred over deletion when the method
 * already has payment history.
 */
export async function togglePaymentMethodAction(
  paymentMethodId: string,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const id = cleanString(
    paymentMethodId,
  );

  if (!id) {
    throw new Error(
      'Invalid payment method.',
    );
  }

  const method =
    await prisma.paymentMethod.findUnique(
      {
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    );

  if (!method) {
    throw new Error(
      'Payment method not found.',
    );
  }

  const updated =
    await prisma.paymentMethod.update({
      where: {
        id: method.id,
      },
      data: {
        isActive: !method.isActive,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  try {
    await recordAudit({
      actorId: admin.id,
      action: updated.isActive
        ? 'ACTIVATE_PAYMENT_METHOD'
        : 'DEACTIVATE_PAYMENT_METHOD',
      entityType: 'PaymentMethod',
      entityId: method.id,
    });
  } catch (auditError) {
    console.error(
      'Payment method toggle audit failed',
      auditError,
    );
  }

  revalidatePath(
    '/admin/payments',
  );
  revalidatePath(
    '/distributor/wallet',
  );
  revalidatePath(
    '/retailer/wallet',
  );
}

/**
 * Permanently delete a payment method only when it has
 * never been used by a payment request.
 *
 * Existing payment history is deliberately preserved.
 */
export async function deletePaymentMethodAction(
  paymentMethodId: string,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const id = cleanString(
    paymentMethodId,
  );

  if (!id) {
    throw new Error(
      'Invalid payment method.',
    );
  }

  const method =
    await prisma.paymentMethod.findUnique(
      {
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: {
              payments: true,
            },
          },
        },
      },
    );

  if (!method) {
    throw new Error(
      'Payment method not found.',
    );
  }

  if (method._count.payments > 0) {
    throw new Error(
      `Cannot delete "${method.name}" because it has existing payment history. Deactivate it instead.`,
    );
  }

  await prisma.paymentMethod.delete({
    where: {
      id: method.id,
    },
  });

  try {
    await recordAudit({
      actorId: admin.id,
      action:
        'DELETE_PAYMENT_METHOD',
      entityType: 'PaymentMethod',
      entityId: method.id,
    });
  } catch (auditError) {
    console.error(
      'DELETE_PAYMENT_METHOD audit failed',
      auditError,
    );
  }

  revalidatePath(
    '/admin/payments',
  );
}

/* -------------------------------------------------------------------------- */
/* PRICING RULES                                                              */
/* -------------------------------------------------------------------------- */

export async function createPricingRuleAction(
  formData: FormData,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const scope = cleanString(
    formData.get('scope') ??
      'GLOBAL',
  );

  const targetRole = cleanString(
    formData.get('targetRole') ??
      'RETAILER',
  );

  const markupType = cleanString(
    formData.get('markupType') ??
      'PERCENTAGE',
  );

  const markupValue = Number(
    formData.get('markupValue') ??
      0,
  );

  const categoryId =
    cleanString(
      formData.get('categoryId'),
    ) || undefined;

  const serviceId =
    cleanString(
      formData.get('serviceId'),
    ) || undefined;

  assertEnumValue(
    scope,
    [
      'GLOBAL',
      'CATEGORY',
      'SERVICE',
    ],
    'pricing scope',
  );

  assertEnumValue(
    targetRole,
    [
      'DISTRIBUTOR',
      'RETAILER',
    ],
    'pricing target role',
  );

  assertEnumValue(
    markupType,
    [
      'PERCENTAGE',
      'FIXED',
    ],
    'markup type',
  );

  if (!Number.isFinite(markupValue)) {
    throw new Error(
      'Enter a valid markup value.',
    );
  }

  if (markupValue < 0) {
    throw new Error(
      'Markup value cannot be negative.',
    );
  }

  if (
    markupType ===
      'PERCENTAGE' &&
    markupValue > 10000
  ) {
    throw new Error(
      'Percentage markup is too large.',
    );
  }

  if (
    scope === 'CATEGORY' &&
    !categoryId
  ) {
    throw new Error(
      'Select a category for this pricing rule.',
    );
  }

  if (
    scope === 'SERVICE' &&
    !serviceId
  ) {
    throw new Error(
      'Select a service for this pricing rule.',
    );
  }

  if (categoryId) {
    const category =
      await prisma.category.findUnique(
        {
          where: {
            id: categoryId,
          },
          select: {
            id: true,
            isActive: true,
          },
        },
      );

    if (!category) {
      throw new Error(
        'Category not found.',
      );
    }

    if (!category.isActive) {
      throw new Error(
        'Cannot create a pricing rule for an inactive category.',
      );
    }
  }

  if (serviceId) {
    const service =
      await prisma.service.findUnique(
        {
          where: {
            id: serviceId,
          },
          select: {
            id: true,
            isActive: true,
          },
        },
      );

    if (!service) {
      throw new Error(
        'Service not found.',
      );
    }

    if (!service.isActive) {
      throw new Error(
        'Cannot create a pricing rule for an inactive service.',
      );
    }
  }

  if (
    scope === 'GLOBAL' &&
    (categoryId || serviceId)
  ) {
    throw new Error(
      'Global pricing rules cannot target a category or service.',
    );
  }

  if (
    scope === 'CATEGORY' &&
    serviceId
  ) {
    throw new Error(
      'Category pricing rules cannot target a specific service.',
    );
  }

  if (
    scope === 'SERVICE' &&
    categoryId
  ) {
    throw new Error(
      'Service pricing rules cannot target a category.',
    );
  }

  const rule =
    await prisma.pricingRule.create({
      data: {
        scope: scope as any,
        targetRole:
          targetRole as any,
        markupType:
          markupType as any,
        markupValue,
        categoryId,
        serviceId,
      },
    });

  try {
    await recordAudit({
      actorId: admin.id,
      action:
        'CREATE_PRICING_RULE',
      entityType: 'PricingRule',
      entityId: rule.id,
    });
  } catch (auditError) {
    console.error(
      'CREATE_PRICING_RULE audit failed',
      auditError,
    );
  }

  revalidatePath(
    '/admin/pricing',
  );
}

export async function deletePricingRuleAction(
  id: string,
) {
  const admin = await requireUser([
    'ADMIN',
  ]);

  const ruleId = cleanString(id);

  if (!ruleId) {
    throw new Error(
      'Invalid pricing rule.',
    );
  }

  const rule =
    await prisma.pricingRule.findUnique(
      {
        where: {
          id: ruleId,
        },
        select: {
          id: true,
        },
      },
    );

  if (!rule) {
    throw new Error(
      'Pricing rule not found.',
    );
  }

  await prisma.pricingRule.delete({
    where: {
      id: rule.id,
    },
  });

  try {
    await recordAudit({
      actorId: admin.id,
      action:
        'DELETE_PRICING_RULE',
      entityType: 'PricingRule',
      entityId: rule.id,
    });
  } catch (auditError) {
    console.error(
      'DELETE_PRICING_RULE audit failed',
      auditError,
    );
  }

  revalidatePath(
    '/admin/pricing',
  );
}