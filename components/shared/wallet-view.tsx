import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getWalletBalance } from '@/server/services/wallet.service';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentRequestForm } from './payment-request-form';
import { formatCurrency } from '@/lib/brand.config';
import {
  Building2,
  CreditCard,
  Landmark,
  QrCode,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

type PaymentMethodConfig = {
  upiId?: string;
  accountName?: string;
  instructions?: string;
  bankAccountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankInstructions?: string;
  gatewayName?: string;
  gatewayMode?: string;
  manualInstructions?: string;
  qrCodeDataUrl?: string;
};

function getConfig(
  config: unknown,
): PaymentMethodConfig {
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    return {};
  }

  return config as PaymentMethodConfig;
}

function maskAccountNumber(
  value?: string,
): string {
  if (!value) {
    return '';
  }

  if (value.length <= 4) {
    return value;
  }

  return `${'•'.repeat(
    Math.max(0, value.length - 4),
  )}${value.slice(-4)}`;
}

function getMethodIcon(type: string) {
  if (type === 'UPI') {
    return QrCode;
  }

  if (type === 'BANK_TRANSFER') {
    return Landmark;
  }

  if (type === 'GATEWAY') {
    return CreditCard;
  }

  return Building2;
}

function getMethodLabel(type: string): string {
  switch (type) {
    case 'UPI':
      return 'UPI Payment';

    case 'BANK_TRANSFER':
      return 'Bank Transfer';

    case 'GATEWAY':
      return 'Payment Gateway';

    case 'MANUAL':
      return 'Manual Payment';

    default:
      return type;
  }
}

function PaymentMethodDetails({
  type,
  config,
}: {
  type: string;
  config: unknown;
}) {
  const data = getConfig(config);

  if (type === 'UPI') {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            {data.accountName && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Account Name
                </p>
                <p className="font-medium">
                  {data.accountName}
                </p>
              </div>
            )}

            {data.upiId && (
              <div>
                <p className="text-xs text-muted-foreground">
                  UPI ID
                </p>
                <p className="break-all font-medium">
                  {data.upiId}
                </p>
              </div>
            )}

            {data.instructions && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Instructions
                </p>
                <p className="text-sm">
                  {data.instructions}
                </p>
              </div>
            )}
          </div>

          {data.qrCodeDataUrl && (
            <div className="flex justify-center">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <img
                  src={data.qrCodeDataUrl}
                  alt="Payment QR Code"
                  className="h-40 w-40 object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'BANK_TRANSFER') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {data.bankAccountName && (
          <div>
            <p className="text-xs text-muted-foreground">
              Account Holder
            </p>
            <p className="font-medium">
              {data.bankAccountName}
            </p>
          </div>
        )}

        {data.bankName && (
          <div>
            <p className="text-xs text-muted-foreground">
              Bank
            </p>
            <p className="font-medium">
              {data.bankName}
            </p>
          </div>
        )}

        {data.accountNumber && (
          <div>
            <p className="text-xs text-muted-foreground">
              Account Number
            </p>
            <p className="font-medium">
              {maskAccountNumber(
                data.accountNumber,
              )}
            </p>
          </div>
        )}

        {data.ifsc && (
          <div>
            <p className="text-xs text-muted-foreground">
              IFSC
            </p>
            <p className="font-medium">
              {data.ifsc}
            </p>
          </div>
        )}

        {data.bankInstructions && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Instructions
            </p>
            <p className="text-sm">
              {data.bankInstructions}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (type === 'GATEWAY') {
    return (
      <div className="space-y-3">
        {data.gatewayName && (
          <div>
            <p className="text-xs text-muted-foreground">
              Gateway
            </p>
            <p className="font-medium">
              {data.gatewayName}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            Online Payment
          </Badge>

          {data.gatewayMode === 'LIVE' ? (
            <Badge variant="success">
              Live
            </Badge>
          ) : (
            <Badge variant="secondary">
              Test
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs text-muted-foreground">
            Payment gateway credentials are securely handled
            by the server. They are never displayed here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.accountName && (
        <div>
          <p className="text-xs text-muted-foreground">
            Account Name
          </p>
          <p className="font-medium">
            {data.accountName}
          </p>
        </div>
      )}

      {data.manualInstructions && (
        <div>
          <p className="text-xs text-muted-foreground">
            Instructions
          </p>
          <p className="text-sm">
            {data.manualInstructions}
          </p>
        </div>
      )}

      {data.qrCodeDataUrl && (
        <div className="flex justify-center">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <img
              src={data.qrCodeDataUrl}
              alt="Payment QR Code"
              className="h-40 w-40 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export async function WalletView() {
  const user = await requireUser([
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const [
    balance,
    methods,
    payments,
  ] = await Promise.all([
    getWalletBalance(user.id),

    prisma.paymentMethod.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.payment.findMany({
      where: {
        userId: user.id,
      },
      include: {
        paymentMethod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Wallet
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage your wallet balance and add funds securely.
        </p>
      </div>

      {/* Balance */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Available Balance
              </p>

              <p className="mt-1 text-4xl font-semibold tracking-tight">
                {formatCurrency(
                  balance.toNumber(),
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Funds */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>
            Add Funds
          </CardTitle>

          <CardDescription>
            Choose an available payment method, complete the
            payment and submit your transaction reference.
            Your balance will be credited after administrator
            verification.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {methods.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-3 text-sm font-medium">
                No payment methods available
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Please contact the administrator.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {methods.map((method) => {
                  const Icon =
                    getMethodIcon(method.type);

                  return (
                    <div
                      key={method.id}
                      className="overflow-hidden rounded-xl border bg-card"
                    >
                      <div className="flex items-start gap-3 border-b bg-muted/20 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">
                              {method.name}
                            </h3>

                            <Badge variant="outline">
                              {getMethodLabel(
                                method.type,
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <PaymentMethodDetails
                          type={method.type}
                          config={method.config}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <PaymentRequestForm
                  methods={methods.map(
                    (method) => ({
                      id: method.id,
                      name: method.name,
                    }),
                  )}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Requests */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payment Requests
          </CardTitle>

          <CardDescription>
            Your recent wallet funding requests.
          </CardDescription>
        </CardHeader>

        <CardContent className="divide-y divide-border">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {formatCurrency(
                    payment.amount.toNumber(),
                  )}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {payment.paymentMethod.name}
                  {' · '}
                  {payment.createdAt.toLocaleDateString(
                    'en-IN',
                  )}
                </p>

                {payment.transactionRef && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Ref: {payment.transactionRef}
                  </p>
                )}
              </div>

              <Badge
                variant={
                  payment.status === 'APPROVED'
                    ? 'success'
                    : payment.status === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {payment.status}
              </Badge>
            </div>
          ))}

          {payments.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No payment requests yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}