'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { encryptSecret } from '@/lib/crypto';
import { recordAudit } from '@/server/services/audit.service';
import {
  loadProviderContext,
  logProviderCall,
} from '@/server/providers/registry';

function assertNonEmpty(value: string, message: string) {
  if (!value.trim()) {
    throw new Error(message);
  }
}

function assertFiniteNumber(
  value: number,
  message: string,
) {
  if (!Number.isFinite(value)) {
    throw new Error(message);
  }
}

function assertPositiveNumber(
  value: number,
  message: string,
) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(message);
  }
}

function assertNonNegativeNumber(
  value: number,
  message: string,
) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(message);
  }
}

function assertPositiveInteger(
  value: number,
  message: string,
) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(message);
  }
}

function assertValidQuantityRange(
  minQuantity: number,
  maxQuantity: number,
) {
  assertPositiveInteger(
    minQuantity,
    'Minimum quantity must be a positive integer.',
  );

  assertPositiveInteger(
    maxQuantity,
    'Maximum quantity must be a positive integer.',
  );

  if (minQuantity > maxQuantity) {
    throw new Error(
      'Minimum quantity cannot exceed maximum quantity.',
    );
  }
}

function parseProviderQuantity(
  value: string,
  fieldName: string,
) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Provider returned an invalid ${fieldName} quantity.`,
    );
  }

  return parsed;
}

function parseProviderRate(value: unknown) {
  const rate = Number(value);

  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error(
      'Provider returned an invalid service rate.',
    );
  }

  return rate;
}

function validateProviderUrl(apiUrl: string) {
  let url: URL;

  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error('Enter a valid provider API URL.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(
      'Provider API URL must use HTTP or HTTPS.',
    );
  }

  return url.toString();
}

export async function createCategoryAction(
  formData: FormData,
) {
  const admin = await requireUser(['ADMIN']);

  const name = String(
    formData.get('name') ?? '',
  ).trim();

  assertNonEmpty(
    name,
    'Category name is required.',
  );

  const category = await prisma.category.create({
    data: {
      name,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'CREATE_CATEGORY',
    entityType: 'Category',
    entityId: category.id,
  });

  revalidatePath('/admin/categories');
}

export async function toggleCategoryAction(
  id: string,
  isActive: boolean,
) {
  const admin = await requireUser(['ADMIN']);

  if (!id) {
    throw new Error('Category ID is required.');
  }

  if (typeof isActive !== 'boolean') {
    throw new Error('Invalid category status.');
  }

  await prisma.category.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'TOGGLE_CATEGORY',
    entityType: 'Category',
    entityId: id,
    metadata: {
      isActive,
    },
  });

  revalidatePath('/admin/categories');
}

export async function createProviderAction(
  formData: FormData,
) {
  const admin = await requireUser(['ADMIN']);

  const name = String(
    formData.get('name') ?? '',
  ).trim();

  const rawApiUrl = String(
    formData.get('apiUrl') ?? '',
  ).trim();

  const apiKey = String(
    formData.get('apiKey') ?? '',
  ).trim();

  const adapterKey = String(
    formData.get('adapterKey') ?? 'generic-http',
  ).trim();

  assertNonEmpty(
    name,
    'Provider name is required.',
  );

  assertNonEmpty(
    rawApiUrl,
    'Provider API URL is required.',
  );

  assertNonEmpty(
    apiKey,
    'Provider API key is required.',
  );

  assertNonEmpty(
    adapterKey,
    'Provider adapter is required.',
  );

  const apiUrl = validateProviderUrl(rawApiUrl);

  const provider = await prisma.provider.create({
    data: {
      name,
      apiUrl,
      adapterKey,
      apiKeyEncrypted: encryptSecret(apiKey),
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'CREATE_PROVIDER',
    entityType: 'Provider',
    entityId: provider.id,
  });

  revalidatePath('/admin/providers');
}

export async function toggleProviderAction(
  id: string,
  isActive: boolean,
) {
  const admin = await requireUser(['ADMIN']);

  if (!id) {
    throw new Error('Provider ID is required.');
  }

  if (typeof isActive !== 'boolean') {
    throw new Error('Invalid provider status.');
  }

  await prisma.provider.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'TOGGLE_PROVIDER',
    entityType: 'Provider',
    entityId: id,
    metadata: {
      isActive,
    },
  });

  revalidatePath('/admin/providers');
}

/**
 * Pulls the service catalog + balance from a provider via its adapter
 * and upserts ProviderService rows.
 */
export async function syncProviderServicesAction(
  providerId: string,
) {
  const admin = await requireUser(['ADMIN']);

  if (!providerId) {
    throw new Error('Provider ID is required.');
  }

  const { adapter, creds } =
    await loadProviderContext(providerId);

  try {
    const [services, balance] = await Promise.all([
      adapter.getServices(creds),
      adapter.getBalance(creds),
    ]);

    if (!Array.isArray(services)) {
      throw new Error(
        'Provider returned an invalid services response.',
      );
    }

    const providerBalance = Number(balance.balance);

    if (
      !Number.isFinite(providerBalance) ||
      providerBalance < 0
    ) {
      throw new Error(
        'Provider returned an invalid balance.',
      );
    }

    const normalizedServices = services.map((service) => {
      const min = parseProviderQuantity(
        service.min,
        'minimum',
      );

      const max = parseProviderQuantity(
        service.max,
        'maximum',
      );

      if (min > max) {
        throw new Error(
          `Provider returned an invalid quantity range for service "${service.name}".`,
        );
      }

      const rate = parseProviderRate(service.rate);

      return {
        providerServiceId: String(
          service.providerServiceId,
        ).trim(),
        name: String(service.name ?? '').trim(),
        costPrice: rate,
        min,
        max,
        dripfeedSupported: Boolean(
          service.dripfeed,
        ),
        refillSupported: Boolean(
          service.refill,
        ),
        cancelSupported: Boolean(
          service.cancel,
        ),
        rawPayload: service as any,
      };
    });

    for (const service of normalizedServices) {
      if (!service.providerServiceId) {
        throw new Error(
          'Provider returned a service without a service ID.',
        );
      }

      if (!service.name) {
        throw new Error(
          `Provider returned an unnamed service (${service.providerServiceId}).`,
        );
      }
    }

    await prisma.$transaction(
      normalizedServices.map((service) =>
        prisma.providerService.upsert({
          where: {
            providerId_providerServiceId: {
              providerId,
              providerServiceId:
                service.providerServiceId,
            },
          },
          create: {
            providerId,
            providerServiceId:
              service.providerServiceId,
            name: service.name,
            costPrice: service.costPrice,
            min: service.min,
            max: service.max,
            dripfeedSupported:
              service.dripfeedSupported,
            refillSupported:
              service.refillSupported,
            cancelSupported:
              service.cancelSupported,
            rawPayload: service.rawPayload,
          },
          update: {
            name: service.name,
            costPrice: service.costPrice,
            min: service.min,
            max: service.max,
            dripfeedSupported:
              service.dripfeedSupported,
            refillSupported:
              service.refillSupported,
            cancelSupported:
              service.cancelSupported,
            rawPayload: service.rawPayload,
            lastSyncedAt: new Date(),
          },
        }),
      ),
    );

    await prisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        balance: providerBalance,
        balanceCheckedAt: new Date(),
      },
    });

    await logProviderCall(
      providerId,
      'getServices',
      true,
      undefined,
      {
        count: normalizedServices.length,
      },
    );

    await recordAudit({
      actorId: admin.id,
      action: 'SYNC_PROVIDER_SERVICES',
      entityType: 'Provider',
      entityId: providerId,
      metadata: {
        count: normalizedServices.length,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown provider sync error.';

    try {
      await logProviderCall(
        providerId,
        'getServices',
        false,
        undefined,
        undefined,
        message,
      );
    } catch {
      // Logging failure must not hide the original sync error.
    }

    throw new Error(`Sync failed: ${message}`);
  }

  revalidatePath('/admin/providers');
  revalidatePath('/admin/services');
}

export async function createServiceAction(
  formData: FormData,
) {
  const admin = await requireUser(['ADMIN']);

  const name = String(
    formData.get('name') ?? '',
  ).trim();

  const categoryId = String(
    formData.get('categoryId') ?? '',
  ).trim();

  const providerServiceId =
    String(
      formData.get('providerServiceId') ?? '',
    ).trim() || undefined;

  const costPrice = Number(
    formData.get('costPrice') ?? 0,
  );

  const adminMarkupValue = Number(
    formData.get('adminMarkupValue') ?? 10,
  );

  const minQuantity = Number.parseInt(
    String(
      formData.get('minQuantity') ?? '1',
    ),
    10,
  );

  const maxQuantity = Number.parseInt(
    String(
      formData.get('maxQuantity') ?? '100000',
    ),
    10,
  );

  assertNonEmpty(
    name,
    'Service name is required.',
  );

  assertNonEmpty(
    categoryId,
    'Category is required.',
  );

  assertPositiveNumber(
    costPrice,
    'Cost price must be greater than zero.',
  );

  assertNonNegativeNumber(
    adminMarkupValue,
    'Admin markup cannot be negative.',
  );

  assertValidQuantityRange(
    minQuantity,
    maxQuantity,
  );

  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!category) {
    throw new Error('Selected category was not found.');
  }

  if (!category.isActive) {
    throw new Error(
      'Cannot create a service under an inactive category.',
    );
  }

  if (providerServiceId) {
    const providerService =
      await prisma.providerService.findFirst({
        where: {
          providerServiceId,
        },
        select: {
          id: true,
        },
      });

    if (!providerService) {
      throw new Error(
        'Selected provider service was not found.',
      );
    }
  }

  const service = await prisma.service.create({
    data: {
      name,
      categoryId,
      providerServiceId,
      costPrice,
      adminMarkupType: 'PERCENTAGE',
      adminMarkupValue,
      minQuantity,
      maxQuantity,
      dripfeedEnabled:
        formData.get('dripfeedEnabled') === 'on',
      refillEnabled:
        formData.get('refillEnabled') === 'on',
      cancelEnabled:
        formData.get('cancelEnabled') === 'on',
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'CREATE_SERVICE',
    entityType: 'Service',
    entityId: service.id,
  });

  revalidatePath('/admin/services');
  revalidatePath('/admin/pricing');
}

export async function toggleServiceAction(
  id: string,
  isActive: boolean,
) {
  const admin = await requireUser(['ADMIN']);

  if (!id) {
    throw new Error('Service ID is required.');
  }

  if (typeof isActive !== 'boolean') {
    throw new Error('Invalid service status.');
  }

  await prisma.service.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'TOGGLE_SERVICE',
    entityType: 'Service',
    entityId: id,
    metadata: {
      isActive,
    },
  });

  revalidatePath('/admin/services');
}

export async function updateServicePricingAction(
  id: string,
  adminMarkupValue: number,
) {
  const admin = await requireUser(['ADMIN']);

  if (!id) {
    throw new Error('Service ID is required.');
  }

  assertNonNegativeNumber(
    adminMarkupValue,
    'Admin markup cannot be negative.',
  );

  await prisma.service.update({
    where: {
      id,
    },
    data: {
      adminMarkupValue,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'UPDATE_SERVICE_PRICING',
    entityType: 'Service',
    entityId: id,
    metadata: {
      adminMarkupValue,
    },
  });

  revalidatePath('/admin/services');
  revalidatePath('/admin/pricing');
}