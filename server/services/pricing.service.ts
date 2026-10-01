import { Prisma, MarkupType, Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';

function applyMarkup(
  base: Prisma.Decimal,
  type: MarkupType,
  value: Prisma.Decimal,
): Prisma.Decimal {
  if (type === 'FIXED') return base.add(value);

  return base.add(base.mul(value).div(100));
}

/**
 * Resolves the admin's base resale price for a service (cost + admin markup).
 * This is the price Distributors effectively buy at unless a specific
 * DistributorPricing override exists.
 */
const SCOPE_RANK: Record<string, number> = {
  SERVICE: 3,
  CATEGORY: 2,
  GLOBAL: 1,
};

export function pickMostSpecificRule<T extends { scope: string }>(
  rules: T[],
): T | undefined {
  return [...rules].sort(
    (a, b) =>
      (SCOPE_RANK[b.scope] ?? 0) -
      (SCOPE_RANK[a.scope] ?? 0),
  )[0];
}

export function applyMarkupPublic(
  base: Prisma.Decimal,
  type: MarkupType,
  value: Prisma.Decimal,
): Prisma.Decimal {
  return applyMarkup(base, type, value);
}

export function computeAdminPrice(service: {
  costPrice: Prisma.Decimal;
  adminMarkupType: MarkupType;
  adminMarkupValue: Prisma.Decimal;
}): Prisma.Decimal {
  return applyMarkup(
    service.costPrice,
    service.adminMarkupType,
    service.adminMarkupValue,
  );
}

/**
 * Resolution order for a given service + tier:
 * 1. Explicit per-user override (DistributorPricing / RetailerPricing)
 * 2. Service-specific PricingRule for that role
 * 3. Category-specific PricingRule for that role
 * 4. Global PricingRule for that role
 * 5. Fallback: admin price
 *
 * Provider cost is NEVER returned to Distributor/Retailer callers.
 */
export async function resolvePrice(params: {
  serviceId: string;
  forRole: Extract<Role, 'DISTRIBUTOR' | 'RETAILER'>;
  distributorId?: string;
  retailerId?: string;
}): Promise<Prisma.Decimal> {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: params.serviceId },
  });

  const adminPrice = computeAdminPrice(service);

  if (params.forRole === 'RETAILER' && params.retailerId) {
    const override = await prisma.retailerPricing.findUnique({
      where: {
        retailerId_serviceId: {
          retailerId: params.retailerId,
          serviceId: params.serviceId,
        },
      },
    });

    if (override) return override.price;
  }

  if (params.forRole === 'DISTRIBUTOR' && params.distributorId) {
    const override = await prisma.distributorPricing.findUnique({
      where: {
        distributorId_serviceId: {
          distributorId: params.distributorId,
          serviceId: params.serviceId,
        },
      },
    });

    if (override) return override.price;
  }

  const rules = await prisma.pricingRule.findMany({
    where: {
      targetRole: params.forRole,
      OR: [
        {
          scope: 'SERVICE',
          serviceId: service.id,
        },
        {
          scope: 'CATEGORY',
          categoryId: service.categoryId,
        },
        {
          scope: 'GLOBAL',
        },
      ],
    },
  });

  const rule = pickMostSpecificRule(rules);

  let base = adminPrice;

  if (params.forRole === 'RETAILER') {
    const retailerId = params.retailerId;

    const parentId =
      params.distributorId ??
      (
        retailerId
          ? (
              await prisma.user.findUnique({
                where: { id: retailerId },
                select: { distributorId: true },
              })
            )?.distributorId
          : undefined
      );

    if (parentId) {
      base = await resolvePrice({
        serviceId: params.serviceId,
        forRole: 'DISTRIBUTOR',
        distributorId: parentId,
      });
    }
  }

  if (rule) {
    return applyMarkup(
      base,
      rule.markupType,
      rule.markupValue,
    );
  }

  return base;
}

/**
 * Batch pricing helpers.
 *
 * These functions preserve the same pricing rules as resolvePrice(),
 * but load the required pricing data in batches instead of executing
 * several Prisma queries for every individual service.
 */

type PricingServiceRecord = {
  id: string;
  categoryId: string;
  costPrice: Prisma.Decimal;
  adminMarkupType: MarkupType;
  adminMarkupValue: Prisma.Decimal;
};

type PricingRuleRecord = {
  scope: string;
  categoryId: string | null;
  serviceId: string | null;
  targetRole: Role;
  markupType: MarkupType;
  markupValue: Prisma.Decimal;
};

function getMostSpecificRuleForService(
  rules: PricingRuleRecord[],
  serviceId: string,
  categoryId: string,
): PricingRuleRecord | undefined {
  const matchingRules = rules.filter((rule) => {
    if (rule.scope === 'SERVICE') {
      return rule.serviceId === serviceId;
    }

    if (rule.scope === 'CATEGORY') {
      return rule.categoryId === categoryId;
    }

    if (rule.scope === 'GLOBAL') {
      return true;
    }

    return false;
  });

  return pickMostSpecificRule(matchingRules);
}

async function loadPricingServices(
  serviceIds: string[],
): Promise<PricingServiceRecord[]> {
  if (serviceIds.length === 0) {
    return [];
  }

  return prisma.service.findMany({
    where: {
      id: {
        in: serviceIds,
      },
    },
    select: {
      id: true,
      categoryId: true,
      costPrice: true,
      adminMarkupType: true,
      adminMarkupValue: true,
    },
  });
}

/**
 * Loads all applicable PricingRules for a set of services in one query.
 */
async function loadPricingRules(
  serviceRecords: PricingServiceRecord[],
  targetRole: Extract<Role, 'DISTRIBUTOR' | 'RETAILER'>,
): Promise<PricingRuleRecord[]> {
  if (serviceRecords.length === 0) {
    return [];
  }

  const serviceIds = serviceRecords.map(
    (service) => service.id,
  );

  const categoryIds = [
    ...new Set(
      serviceRecords.map(
        (service) => service.categoryId,
      ),
    ),
  ];

  return prisma.pricingRule.findMany({
    where: {
      targetRole,
      OR: [
        {
          scope: 'SERVICE',
          serviceId: {
            in: serviceIds,
          },
        },
        {
          scope: 'CATEGORY',
          categoryId: {
            in: categoryIds,
          },
        },
        {
          scope: 'GLOBAL',
        },
      ],
    },
    select: {
      scope: true,
      categoryId: true,
      serviceId: true,
      targetRole: true,
      markupType: true,
      markupValue: true,
    },
  });
}

/**
 * Returns distributor prices for many services with a small number
 * of database queries.
 */
export async function getDistributorPrices(
  serviceIds: string[],
  distributorId: string,
): Promise<Map<string, Prisma.Decimal>> {
  const uniqueServiceIds = [
    ...new Set(serviceIds.filter(Boolean)),
  ];

  const result = new Map<string, Prisma.Decimal>();

  if (uniqueServiceIds.length === 0) {
    return result;
  }

  const services = await loadPricingServices(
    uniqueServiceIds,
  );

  if (services.length === 0) {
    return result;
  }

  const [overrides, rules] = await Promise.all([
    prisma.distributorPricing.findMany({
      where: {
        distributorId,
        serviceId: {
          in: uniqueServiceIds,
        },
      },
      select: {
        serviceId: true,
        price: true,
      },
    }),

    loadPricingRules(
      services,
      'DISTRIBUTOR',
    ),
  ]);

  const overrideMap = new Map(
    overrides.map((override) => [
      override.serviceId,
      override.price,
    ]),
  );

  for (const service of services) {
    const override = overrideMap.get(service.id);

    if (override) {
      result.set(service.id, override);
      continue;
    }

    const adminPrice = computeAdminPrice(service);

    const rule = getMostSpecificRuleForService(
      rules,
      service.id,
      service.categoryId,
    );

    result.set(
      service.id,
      rule
        ? applyMarkup(
            adminPrice,
            rule.markupType,
            rule.markupValue,
          )
        : adminPrice,
    );
  }

  return result;
}

/**
 * Returns retailer prices for many services with a small number
 * of database queries.
 */
export async function getRetailerPrices(
  serviceIds: string[],
  retailerId: string,
): Promise<Map<string, Prisma.Decimal>> {
  const uniqueServiceIds = [
    ...new Set(serviceIds.filter(Boolean)),
  ];

  const result = new Map<string, Prisma.Decimal>();

  if (uniqueServiceIds.length === 0) {
    return result;
  }

  const services = await loadPricingServices(
    uniqueServiceIds,
  );

  if (services.length === 0) {
    return result;
  }

  const retailer = await prisma.user.findUniqueOrThrow({
    where: {
      id: retailerId,
    },
    select: {
      distributorId: true,
    },
  });

  const distributorId = retailer.distributorId;

  const [
    retailerOverrides,
    retailerRules,
    distributorOverrides,
    distributorRules,
  ] = await Promise.all([
    prisma.retailerPricing.findMany({
      where: {
        retailerId,
        serviceId: {
          in: uniqueServiceIds,
        },
      },
      select: {
        serviceId: true,
        price: true,
      },
    }),

    loadPricingRules(
      services,
      'RETAILER',
    ),

    distributorId
      ? prisma.distributorPricing.findMany({
          where: {
            distributorId,
            serviceId: {
              in: uniqueServiceIds,
            },
          },
          select: {
            serviceId: true,
            price: true,
          },
        })
      : Promise.resolve([]),

    loadPricingRules(
      services,
      'DISTRIBUTOR',
    ),
  ]);

  const retailerOverrideMap = new Map(
    retailerOverrides.map((override) => [
      override.serviceId,
      override.price,
    ]),
  );

  const distributorOverrideMap = new Map(
    distributorOverrides.map((override) => [
      override.serviceId,
      override.price,
    ]),
  );

  /**
   * First resolve the distributor price for every service.
   */
  const distributorPriceMap = new Map<
    string,
    Prisma.Decimal
  >();

  for (const service of services) {
    const distributorOverride =
      distributorOverrideMap.get(service.id);

    if (distributorOverride) {
      distributorPriceMap.set(
        service.id,
        distributorOverride,
      );
      continue;
    }

    const adminPrice = computeAdminPrice(service);

    const distributorRule =
      getMostSpecificRuleForService(
        distributorRules,
        service.id,
        service.categoryId,
      );

    const distributorPrice = distributorRule
      ? applyMarkup(
          adminPrice,
          distributorRule.markupType,
          distributorRule.markupValue,
        )
      : adminPrice;

    distributorPriceMap.set(
      service.id,
      distributorPrice,
    );
  }

  /**
   * Then resolve the retailer price.
   *
   * Retailer-specific override remains the highest-priority
   * result, exactly like resolvePrice().
   */
  for (const service of services) {
    const retailerOverride =
      retailerOverrideMap.get(service.id);

    if (retailerOverride) {
      result.set(
        service.id,
        retailerOverride,
      );
      continue;
    }

    const distributorPrice =
      distributorPriceMap.get(service.id) ??
      computeAdminPrice(service);

    const retailerRule =
      getMostSpecificRuleForService(
        retailerRules,
        service.id,
        service.categoryId,
      );

    const retailerPrice = retailerRule
      ? applyMarkup(
          distributorPrice,
          retailerRule.markupType,
          retailerRule.markupValue,
        )
      : distributorPrice;

    result.set(
      service.id,
      retailerPrice,
    );
  }

  return result;
}

/**
 * Retailer-facing price resolution convenience.
 */
export async function getRetailerPrice(
  serviceId: string,
  retailerId: string,
) {
  return resolvePrice({
    serviceId,
    forRole: 'RETAILER',
    retailerId,
  });
}

export async function getDistributorPrice(
  serviceId: string,
  distributorId: string,
) {
  return resolvePrice({
    serviceId,
    forRole: 'DISTRIBUTOR',
    distributorId,
  });
}