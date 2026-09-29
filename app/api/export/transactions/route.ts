import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { getCurrentUser } from '@/lib/session';

import { resolveRange } from '@/lib/date-range';

import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const sp = request.nextUrl.searchParams;

  const { start, end } = resolveRange(
    sp.get('range') ?? undefined,
    sp.get('from') ?? undefined,
    sp.get('to') ?? undefined,
  );

  const userFilter =
    user.role === 'ADMIN'
      ? {}
      : user.role === 'DISTRIBUTOR'
        ? {
            user: {
              OR: [
                { id: user.id },
                { distributorId: user.id },
              ],
            },
          }
        : {
            userId: user.id,
          };

  const txns = await prisma.walletTransaction.findMany({
    where: {
      ...userFilter,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5000,
  });

  const rows = txns.map((t: any) => [
    t.id,
    t.createdAt.toISOString(),
    t.user.username,
    t.type,
    t.amount.toFixed(4),
    t.previousBalance.toFixed(4),
    t.newBalance.toFixed(4),
    t.description,
  ]);

  return new NextResponse(
    toCsv([
      [
        'ID',
        'Date',
        'User',
        'Type',
        'Amount',
        'Previous Balance',
        'New Balance',
        'Description',
      ],
      ...rows,
    ]),
    {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="transactions.csv"',
      },
    },
  );
}