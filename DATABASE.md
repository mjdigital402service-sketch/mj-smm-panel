# Database

PostgreSQL via Prisma (`prisma/schema.prisma`). All money is `Decimal` (never floats).

- **User** (roles ADMIN/DISTRIBUTOR/RETAILER; a retailer points to its distributor via `distributorId`), **Session** (hashed token).
- **Wallet** (one per user) + **WalletTransaction** (immutable ledger: type, amount, previous/new balance, reference, description). Every balance change happens in a DB transaction that row-locks the wallet (`SELECT … FOR UPDATE`) and writes a ledger row.
- **Provider**, **ProviderService**, **ProviderLog** — upstream integration data; keys stored encrypted.
- **Category**, **Service** (public `serviceCode`, cost, admin markup), **PricingRule** (GLOBAL/CATEGORY/SERVICE per target role), **DistributorPricing**, **RetailerPricing** (explicit overrides).
- **Order** (charge, providerCost, profit, status, `idempotencyKey` unique), **OrderStatusHistory**.
- **Payment**, **PaymentMethod**; **ApiKey** (hashed), **ApiLog**; **Ticket**, **TicketMessage**; **Notification**; **AuditLog**; **SystemSetting** (also used for short-lived password-reset tokens).

Price resolution: retailer override → most specific rule (SERVICE > CATEGORY > GLOBAL) applied on the distributor price → distributor price (its own override/rule on the admin price) → admin price (cost + admin markup).

Create migrations with `npx prisma migrate dev --name init`; apply in production with `npx prisma migrate deploy`.
