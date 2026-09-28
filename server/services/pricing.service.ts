import { Prisma, MarkupType, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function applyMarkup(base: Prisma.Decimal, type: MarkupType, value: Prisma.Decimal): Prisma.Decimal {
  if (type === 'FIXED') return base.add(value);
  return base.add(base.mul(value).div(100));
}

/**
 * Resolves the admin's base resale price for a service (cost + admin markup).
 * This is the price Distributors effectively buy at unless a specific
 * DistributorPricing override exists.
 */
const SCOPE_RANK: Record<string, number> = { SERVICE: 3, CATEGORY: 2, GLOBAL: 1 };

export function pickMostSpecificRule<T extends { scope: string }>(rules: T[]): T | undefined {
  return [...rules].sort((a, b) => (SCOPE_RANK[b.scope] ?? 0) - (SCOPE_RANK[a.scope] ?? 0))[0];
}

export function applyMarkupPublic(base: Prisma.Decimal, type: MarkupType, value: Prisma.Decimal): Prisma.Decimal {
  return applyMarkup(base, type, value);
}

export function computeAdminPrice(service: {
  costPrice: Prisma.Decimal;
  adminMarkupType: MarkupType;
  adminMarkupValue: Prisma.Decimal;
}): Prisma.Decimal {
  return applyMarkup(service.costPrice, service.adminMarkupType, service.adminMarkupValue);
}

/**
 * Resolution order for a given service + tier:
 * 1. Explicit per-user override (DistributorPricing / RetailerPricing)
 * 2. Service-specific PricingRule for that role
 * 3. Category-specific PricingRule for that role
 * 4. Global PricingRule for that role
 * 5. Fallback: admin price (for distributor tier) or admin price with 0 extra markup (for retailer tier)
 *
 * Provider cost is NEVER returned to Distributor/Retailer callers of this function.
 */
export async function resolvePrice(params: {
  serviceId: string;
  forRole: Extract<Role, 'DISTRIBUTOR' | 'RETAILER'>;
  distributorId?: string; // required to check DistributorPricing
  retailerId?: string; // required to check RetailerPricing
}): Promise<Prisma.Decimal> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: params.serviceId } });
  const adminPrice = computeAdminPrice(service);

  if (params.forRole === 'RETAILER' && params.retailerId) {
    const override = await prisma.retailerPricing.findUnique({
      where: { retailerId_serviceId: { retailerId: params.retailerId, serviceId: params.serviceId } },
    });
    if (override) return override.price;
  }

  if (params.forRole === 'DISTRIBUTOR' && params.distributorId) {
    const override = await prisma.distributorPricing.findUnique({
      where: { distributorId_serviceId: { distributorId: params.distributorId, serviceId: params.serviceId } },
    });
    if (override) return override.price;
  }

  const rules = await prisma.pricingRule.findMany({
    where: {
      targetRole: params.forRole,
      OR: [
        { scope: 'SERVICE', serviceId: service.id },
        { scope: 'CATEGORY', categoryId: service.categoryId },
        { scope: 'GLOBAL' },
      ],
    },
  });
  // Most specific rule wins: SERVICE > CATEGORY > GLOBAL.
  const rule = pickMostSpecificRule(rules);

  // Retailer tier is layered on the retailer's distributor price (Admin ->
  // Distributor -> Retailer). Distributor tier layers on the admin price.
  let base = adminPrice;
  if (params.forRole === 'RETAILER') {
    const retailerId = params.retailerId;
    const parentId =
      params.distributorId ??
      (retailerId ? (await prisma.user.findUnique({ where: { id: retailerId }, select: { distributorId: true } }))?.distributorId : undefined);
    if (parentId) base = await resolvePrice({ serviceId: params.serviceId, forRole: 'DISTRIBUTOR', distributorId: parentId });
  }
  if (rule) return applyMarkup(base, rule.markupType, rule.markupValue);

  return base;
}

/** Retailer-facing price resolution convenience (never exposes provider cost). */
export async function getRetailerPrice(serviceId: string, retailerId: string) {
  return resolvePrice({ serviceId, forRole: 'RETAILER', retailerId });
}

export async function getDistributorPrice(serviceId: string, distributorId: string) {
  return resolvePrice({ serviceId, forRole: 'DISTRIBUTOR', distributorId });
}
