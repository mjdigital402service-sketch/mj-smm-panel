import { Prisma, WalletTxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class InsufficientBalanceError extends Error {
  constructor(message = 'Insufficient wallet balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export type WalletDeltaParams = {
  userId: string;
  delta?: Prisma.Decimal | number | string;
  amount?: Prisma.Decimal | number | string;
  type: WalletTxType;
  reference?: string | null;
  description?: string;
  allowNegative?: boolean;
};

export type CreditWalletParams = {
  userId: string;
  amount: Prisma.Decimal | number | string;
  type?: WalletTxType;
  reference?: string | null;
  description?: string;
};

export type DebitWalletParams = {
  userId: string;
  amount: Prisma.Decimal | number | string;
  type?: WalletTxType;
  reference?: string | null;
  description?: string;
  allowNegative?: boolean;
};

const MAX_MONEY = new Prisma.Decimal('9999999999.9999');

function toDecimal(
  value: Prisma.Decimal | number | string,
): Prisma.Decimal {
  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite()) {
    throw new Error('Invalid monetary amount');
  }

  if (decimal.decimalPlaces() > 4) {
    throw new Error(
      'Monetary amount cannot have more than 4 decimal places',
    );
  }

  if (decimal.abs().greaterThan(MAX_MONEY)) {
    throw new Error(
      'Monetary amount exceeds the allowed limit',
    );
  }

  return decimal;
}

function normalizeDescription(
  description?: string,
): string {
  const value = description?.trim();

  if (!value) {
    return 'Wallet transaction';
  }

  return value.slice(0, 500);
}

function normalizeReference(
  reference?: string | null,
): string | null {
  const value = reference?.trim();

  if (!value) {
    return null;
  }

  return value.slice(0, 191);
}

export async function applyWalletDelta(
  tx: Prisma.TransactionClient,
  params: WalletDeltaParams,
) {
  if (!params.userId) {
    throw new Error('User ID is required');
  }

  const rawDelta = params.delta ?? params.amount;

  if (rawDelta === undefined) {
    throw new Error(
      'Wallet delta amount is required',
    );
  }

  const delta = toDecimal(rawDelta);

  if (delta.isZero()) {
    throw new Error(
      'Wallet delta cannot be zero',
    );
  }

  const user = await tx.user.findUnique({
    where: {
      id: params.userId,
    },
    select: {
      id: true,
      allowNegativeBalance: true,
      creditLimit: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await tx.wallet.upsert({
    where: {
      userId: params.userId,
    },
    create: {
      userId: params.userId,
      balance: new Prisma.Decimal(0),
    },
    update: {},
  });

  /*
   * Lock the wallet row so concurrent wallet operations
   * cannot calculate their balances from the same old value.
   */
  await tx.$queryRaw`
    SELECT "id"
    FROM "Wallet"
    WHERE "userId" = ${params.userId}
    FOR UPDATE
  `;

  const wallet = await tx.wallet.findUnique({
    where: {
      userId: params.userId,
    },
    select: {
      id: true,
      balance: true,
    },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const previousBalance = new Prisma.Decimal(
    wallet.balance,
  );

  const newBalance = previousBalance.add(delta);

  /*
   * Negative balance is allowed only when:
   *
   * 1. The operation explicitly allows it.
   * 2. The user account allows negative balance.
   * 3. The configured credit limit is not exceeded.
   */
  if (newBalance.isNegative()) {
    const negativeAllowed =
      params.allowNegative === true &&
      user.allowNegativeBalance === true;

    if (!negativeAllowed) {
      throw new InsufficientBalanceError(
        'Insufficient wallet balance',
      );
    }

    const creditLimit = new Prisma.Decimal(
      user.creditLimit ?? 0,
    );

    if (
      newBalance
        .abs()
        .greaterThan(creditLimit)
    ) {
      throw new InsufficientBalanceError(
        `Credit limit exceeded. Maximum allowed negative balance is ${creditLimit.toFixed(
          4,
        )}`,
      );
    }
  }

  await tx.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      balance: newBalance,
    },
  });

  const transaction =
    await tx.walletTransaction.create({
      data: {
        userId: params.userId,
        type: params.type,
        amount: delta.abs(),
        previousBalance,
        newBalance,
        reference: normalizeReference(
          params.reference,
        ),
        description: normalizeDescription(
          params.description,
        ),
      },
    });

  return {
    walletId: wallet.id,
    transactionId: transaction.id,
    previousBalance,
    newBalance,
    delta,
  };
}

/**
 * Credit wallet.
 *
 * Supports:
 *
 * creditWallet(params)
 *
 * and:
 *
 * creditWallet(tx, params)
 */
export async function creditWallet(
  params: CreditWalletParams,
): Promise<
  Awaited<
    ReturnType<typeof applyWalletDelta>
  >
>;

export async function creditWallet(
  tx: Prisma.TransactionClient,
  params: CreditWalletParams,
): Promise<
  Awaited<
    ReturnType<typeof applyWalletDelta>
  >
>;

export async function creditWallet(
  txOrParams:
    | Prisma.TransactionClient
    | CreditWalletParams,
  maybeParams?: CreditWalletParams,
) {
  const isTransactionClient =
    maybeParams !== undefined;

  const tx = isTransactionClient
    ? (txOrParams as Prisma.TransactionClient)
    : undefined;

  const params = isTransactionClient
    ? maybeParams!
    : (txOrParams as CreditWalletParams);

  const amount = toDecimal(params.amount);

  if (
    amount.isNegative() ||
    amount.isZero()
  ) {
    throw new Error(
      'Credit amount must be greater than zero',
    );
  }

  const operation = async (
    client: Prisma.TransactionClient,
  ) =>
    applyWalletDelta(client, {
      userId: params.userId,
      delta: amount,
      type:
        params.type ??
        WalletTxType.MANUAL_CREDIT,
      reference: params.reference,
      description: params.description,
      allowNegative: false,
    });

  if (tx) {
    return operation(tx);
  }

  return prisma.$transaction(operation);
}

/**
 * Debit wallet.
 *
 * Supports:
 *
 * debitWallet(params)
 *
 * and:
 *
 * debitWallet(tx, params)
 */
export async function debitWallet(
  params: DebitWalletParams,
): Promise<
  Awaited<
    ReturnType<typeof applyWalletDelta>
  >
>;

export async function debitWallet(
  tx: Prisma.TransactionClient,
  params: DebitWalletParams,
): Promise<
  Awaited<
    ReturnType<typeof applyWalletDelta>
  >
>;

export async function debitWallet(
  txOrParams:
    | Prisma.TransactionClient
    | DebitWalletParams,
  maybeParams?: DebitWalletParams,
) {
  const isTransactionClient =
    maybeParams !== undefined;

  const tx = isTransactionClient
    ? (txOrParams as Prisma.TransactionClient)
    : undefined;

  const params = isTransactionClient
    ? maybeParams!
    : (txOrParams as DebitWalletParams);

  const amount = toDecimal(params.amount);

  if (
    amount.isNegative() ||
    amount.isZero()
  ) {
    throw new Error(
      'Debit amount must be greater than zero',
    );
  }

  const operation = async (
    client: Prisma.TransactionClient,
  ) =>
    applyWalletDelta(client, {
      userId: params.userId,
      delta: amount.negated(),
      type:
        params.type ??
        WalletTxType.MANUAL_DEBIT,
      reference: params.reference,
      description: params.description,
      allowNegative: params.allowNegative,
    });

  if (tx) {
    return operation(tx);
  }

  return prisma.$transaction(operation);
}

export async function ensureWallet(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  return tx.wallet.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      balance: new Prisma.Decimal(0),
    },
    update: {},
  });
}

export async function getWalletBalance(
  userId: string,
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const wallet =
    await prisma.wallet.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });

  return (
    wallet?.balance ??
    new Prisma.Decimal(0)
  );
}

export async function getWalletSummary(
  userId: string,
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const [wallet, user] =
    await Promise.all([
      prisma.wallet.findUnique({
        where: {
          userId,
        },
        select: {
          balance: true,
        },
      }),

      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          creditLimit: true,
          allowNegativeBalance: true,
        },
      }),
    ]);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    balance:
      wallet?.balance ??
      new Prisma.Decimal(0),

    creditLimit: user.creditLimit,

    allowNegativeBalance:
      user.allowNegativeBalance,
  };
}