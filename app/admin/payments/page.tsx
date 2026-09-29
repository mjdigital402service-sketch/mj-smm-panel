import { prisma } from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  createPaymentMethodAction,
  deletePaymentMethodAction,
  togglePaymentMethodAction,
} from '@/server/actions/payment.actions';
import { formatCurrency } from '@/lib/brand.config';
import { PaymentReviewActions } from './payment-review-actions';

function getConfigValue(
  config: unknown,
  key: string,
): string {
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    return '';
  }

  const value = (config as Record<string, unknown>)[key];

  return typeof value === 'string' ? value : '';
}

function getMethodDescription(
  type: string,
  config: unknown,
): string {
  if (type === 'UPI') {
    const upiId = getConfigValue(config, 'upiId');

    return upiId
      ? `UPI: ${upiId}`
      : 'UPI payment method';
  }

  if (type === 'BANK_TRANSFER') {
    const bankName = getConfigValue(config, 'bankName');

    return bankName
      ? `Bank: ${bankName}`
      : 'Bank transfer method';
  }

  if (type === 'GATEWAY') {
    const gatewayName = getConfigValue(
      config,
      'gatewayName',
    );

    return gatewayName
      ? `Gateway: ${gatewayName}`
      : 'Payment gateway';
  }

  return 'Manual payment method';
}

export default async function AdminPaymentsPage() {
  const [payments, methods] = await Promise.all([
    prisma.payment.findMany({
      include: {
        user: true,
        paymentMethod: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    }),

    prisma.paymentMethod.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Management
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage payment methods, QR payments, bank transfers and
          payment gateways.
        </p>
      </div>

      {/* Add Payment Method */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-lg">
            Add Payment Method
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Configure how distributors and retailers can add money
            to their wallet.
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <form
            action={createPaymentMethodAction}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Payment Method Name
                </Label>

                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. MJ Digital Service UPI"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type">
                  Payment Type
                </Label>

                <select
                  id="type"
                  name="type"
                  defaultValue="UPI"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="UPI">
                    UPI
                  </option>

                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>

                  <option value="GATEWAY">
                    Payment Gateway
                  </option>

                  <option value="MANUAL">
                    Manual Payment
                  </option>
                </select>
              </div>
            </div>

            {/* UPI Configuration */}
            <div className="rounded-xl border bg-muted/10 p-5">
              <div className="mb-4">
                <h3 className="font-medium">
                  UPI Configuration
                </h3>

                <p className="text-xs text-muted-foreground">
                  Enter the UPI details that customers will use
                  for payment.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="upiId">
                    UPI ID
                  </Label>

                  <Input
                    id="upiId"
                    name="upiId"
                    placeholder="yourname@upi"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accountName">
                    Account / Business Name
                  </Label>

                  <Input
                    id="accountName"
                    name="accountName"
                    placeholder="MJ DIGITAL SERVICE"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="upiInstructions">
                    Payment Instructions
                  </Label>

                  <Input
                    id="upiInstructions"
                    name="instructions"
                    placeholder="Pay using UPI and enter the transaction reference after payment."
                  />
                </div>
              </div>
            </div>

            {/* Bank Configuration */}
            <div className="rounded-xl border bg-muted/10 p-5">
              <div className="mb-4">
                <h3 className="font-medium">
                  Bank Transfer Configuration
                </h3>

                <p className="text-xs text-muted-foreground">
                  Add the bank account details for manual bank
                  transfers.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccountName">
                    Account Holder Name
                  </Label>

                  <Input
                    id="bankAccountName"
                    name="bankAccountName"
                    placeholder="Account holder name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bankName">
                    Bank Name
                  </Label>

                  <Input
                    id="bankName"
                    name="bankName"
                    placeholder="Bank name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber">
                    Account Number
                  </Label>

                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    placeholder="Account number"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ifsc">
                    IFSC Code
                  </Label>

                  <Input
                    id="ifsc"
                    name="ifsc"
                    placeholder="ABCD0001234"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="bankInstructions">
                    Bank Transfer Instructions
                  </Label>

                  <Input
                    id="bankInstructions"
                    name="bankInstructions"
                    placeholder="Transfer the amount and submit the transaction reference."
                  />
                </div>
              </div>
            </div>

            {/* QR Upload */}
            <div className="rounded-xl border bg-muted/10 p-5">
              <div className="mb-4">
                <h3 className="font-medium">
                  QR Code
                </h3>

                <p className="text-xs text-muted-foreground">
                  Upload the QR code customers should scan for
                  payment.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qrCode">
                  QR Code Image
                </Label>

                <Input
                  id="qrCode"
                  name="qrCode"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="cursor-pointer"
                />

                <p className="text-xs text-muted-foreground">
                  Supported formats: PNG, JPG, JPEG, WEBP.
                </p>
              </div>
            </div>

            {/* Payment Gateway */}
            <div className="rounded-xl border bg-muted/10 p-5">
              <div className="mb-4">
                <h3 className="font-medium">
                  Payment Gateway Configuration
                </h3>

                <p className="text-xs text-muted-foreground">
                  Configure your gateway credentials. Sensitive
                  credentials will be handled server-side.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gatewayName">
                    Gateway Name
                  </Label>

                  <Input
                    id="gatewayName"
                    name="gatewayName"
                    placeholder="e.g. Razorpay"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="merchantId">
                    Merchant ID
                  </Label>

                  <Input
                    id="merchantId"
                    name="merchantId"
                    placeholder="Merchant / Client ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="apiKey">
                    API Key
                  </Label>

                  <Input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    placeholder="Gateway API key"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="secretKey">
                    Secret Key
                  </Label>

                  <Input
                    id="secretKey"
                    name="secretKey"
                    type="password"
                    placeholder="Gateway secret"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="webhookSecret">
                    Webhook Secret
                  </Label>

                  <Input
                    id="webhookSecret"
                    name="webhookSecret"
                    type="password"
                    placeholder="Webhook signing secret"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gatewayMode">
                    Gateway Mode
                  </Label>

                  <select
                    id="gatewayMode"
                    name="gatewayMode"
                    defaultValue="TEST"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="TEST">
                      Test / Sandbox
                    </option>

                    <option value="LIVE">
                      Live / Production
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Manual Configuration */}
            <div className="rounded-xl border bg-muted/10 p-5">
              <div className="mb-4">
                <h3 className="font-medium">
                  Manual Payment Configuration
                </h3>

                <p className="text-xs text-muted-foreground">
                  Use this for payment methods that require
                  administrator verification.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manualInstructions">
                  Instructions
                </Label>

                <Input
                  id="manualInstructions"
                  name="manualInstructions"
                  placeholder="Contact support after making the payment."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit">
                Add Payment Method
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Configured Payment Methods
          </CardTitle>
        </CardHeader>

        <CardContent>
          {methods.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No payment methods configured yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {methods.map((method: any) => {
                const toggleAction =
                  togglePaymentMethodAction.bind(
                    null,
                    method.id,
                  );

                const deleteAction =
                  deletePaymentMethodAction.bind(
                    null,
                    method.id,
                  );

                return (
                  <div
                    key={method.id}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">
                          {method.name}
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {getMethodDescription(
                            method.type,
                            method.config,
                          )}
                        </p>
                      </div>

                      <Badge
                        variant={
                          method.isActive
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {method.isActive
                          ? 'ACTIVE'
                          : 'INACTIVE'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <Badge variant="outline">
                        {method.type}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          method.createdAt,
                        ).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    {/* Payment Method Actions */}
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                      <form action={toggleAction}>
                        <Button
                          type="submit"
                          size="sm"
                          variant={
                            method.isActive
                              ? 'outline'
                              : 'default'
                          }
                        >
                          {method.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                        </Button>
                      </form>

                      <form action={deleteAction}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Payment Requests ({payments.length})
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Review wallet funding requests submitted by
            distributors and retailers.
          </p>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">
                  User
                </th>

                <th className="pb-2 font-medium">
                  Method
                </th>

                <th className="pb-2 font-medium">
                  Amount
                </th>

                <th className="pb-2 font-medium">
                  Reference
                </th>

                <th className="pb-2 font-medium">
                  Status
                </th>

                <th className="pb-2 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment: any) => (
                <tr
                  key={payment.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3">
                    <div>
                      <p className="font-medium">
                        {payment.user.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {payment.user.email}
                      </p>
                    </div>
                  </td>

                  <td className="py-3">
                    <div>
                      <p className="text-xs font-medium">
                        {payment.paymentMethod.name}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        {payment.paymentMethod.type}
                      </p>
                    </div>
                  </td>

                  <td className="py-3 font-medium">
                    {formatCurrency(
                      payment.amount.toNumber(),
                    )}
                  </td>

                  <td className="py-3 text-xs">
                    {payment.transactionRef ?? '—'}
                  </td>

                  <td className="py-3">
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
                  </td>

                  <td className="py-3 text-right">
                    {payment.status === 'PENDING' && (
                      <PaymentReviewActions
                        paymentId={payment.id}
                      />
                    )}
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No payment requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}