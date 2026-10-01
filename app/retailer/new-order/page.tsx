import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getRetailerPrices } from '@/server/services/pricing.service';
import { getWalletBalance } from '@/server/services/wallet.service';
import { NewOrderForm } from '@/components/shared/new-order-form';

export default async function NewOrderPage() {
  const user = await requireUser(['RETAILER']);

  const [services, balance] = await Promise.all([
    prisma.service.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
        providerServiceId: { not: null },
      },
      select: {
        id: true,
        serviceCode: true,
        name: true,
        description: true,
        minQuantity: true,
        maxQuantity: true,
        dripfeedEnabled: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { serviceCode: 'asc' },
      ],
    }),

    getWalletBalance(user.id),
  ]);

  const prices = await getRetailerPrices(
    services.map((service) => service.id),
    user.id,
  );

  const options = services.map((s) => ({
    id: s.id,
    serviceCode: s.serviceCode,
    name: s.name,
    category: s.category.name,
    rate: prices.get(s.id)?.toNumber() ?? 0,
    min: s.minQuantity,
    max: s.maxQuantity,
    dripfeed: s.dripfeedEnabled,
    description: s.description ?? '',
  }));

  return (
    <NewOrderForm
      services={options}
      balance={balance.toNumber()}
    />
  );
}