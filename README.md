# YOUR BRAND — SMM Service Management & Reseller Platform

Three-role platform: **Admin → Distributor → Retailer**. Ledger-based wallets, a pricing engine, a provider adapter layer, an order engine with automatic refunds, its own REST API, tickets, notifications, reports and audit logs.

> **Build status (please read):** this source was written in a sandbox with **no network access**, so `npm install`, `prisma migrate`, `next build`, lint and the tests were **never executed** by the author. The code has been reviewed by hand but not compiled. Run the verification steps below first and fix anything they surface. See "Known gaps".

## Tech stack
Next.js 14 (App Router, Server Actions, Route Handlers) · TypeScript · React · Tailwind CSS · Radix/shadcn-style components · Lucide · PostgreSQL · Prisma · Argon2 · Zod · React Hook Form (dependency present; forms currently use server actions) · TanStack Table (dependency present; tables are server-rendered) · Recharts · Vitest.

## Requirements
Node.js 18.18+ (20 LTS recommended), PostgreSQL 14+.

## Setup
```bash
cp .env.example .env          # then edit values
openssl rand -base64 32       # use for AUTH_SECRET, ENCRYPTION_KEY, CRON_SECRET (one each)
npm install                   # also runs prisma generate
npx prisma migrate dev --name init   # creates prisma/migrations from schema.prisma
npm run db:seed               # DEV ONLY sample data
npm run dev                   # http://localhost:3000
```
Verification: `npm run typecheck && npm run lint && npm test && npm run build`.
DB integration tests run only when `DATABASE_URL` points at a real database (they are skipped otherwise).

Production: `npm run db:migrate:deploy && npm run build && npm start`.

## Development logins (seed only — never use in production)
| Role | Username | Password |
|---|---|---|
| Admin | admin | Admin@12345 |
| Distributor | distributor1, distributor2 | Distributor@123 |
| Retailer | retailer1–retailer4 | Retailer@123 |

## Branding
Change name, currency and tagline in one file: `lib/brand.config.ts`.

## Layout
`app/` routes (admin, distributor, retailer, api) · `components/` UI · `lib/` helpers (session, crypto, password, validations) · `server/services` business logic (wallet, pricing, orders, sync, audit, notifications, reports, settings) · `server/actions` server actions · `server/providers` adapters (`base`, `generic-http`, `mock`) · `prisma/` schema + seed · `tests/`.

## Provider integration guide
1. Implement `ProviderAdapter` (`server/providers/base/types.ts`) in `server/providers/<name>/adapter.ts`.
2. Register it in `server/providers/registry.ts`.
3. Admin → Providers: add name, API URL, key, choose the adapter. The key is encrypted with AES-256-GCM (`ENCRYPTION_KEY`) and never sent to the browser.
4. Press **Sync** to import provider services, then map/create Services in Admin → Services.
`generic-http` speaks a common form-encoded `key`+`action` protocol (services/balance/add/status/cancel/refill); adjust it if your upstream differs. `mock` is for development only.
Schedule order sync: `POST /api/internal/sync-orders` with header `x-cron-secret: $CRON_SECRET` every 1–5 minutes.

## Payment integration guide
Manual/UPI/bank payments work today: users submit a reference, Admin approves/rejects (approval credits the ledger once). No gateway is wired: nothing marks a payment successful automatically. To add one, create a `PaymentMethod` of type `GATEWAY`, add a webhook route that **verifies the gateway signature server-side** with `PAYMENT_WEBHOOK_SECRET`, and credit via `creditWallet(... type: 'PAYMENT', reference)` guarded by a unique reference to stay idempotent.

## Security notes
Argon2id passwords · opaque httpOnly SameSite=Lax session cookie (only a SHA-256 hash is stored) · roles verified server-side in every layout/action/route (middleware is only a redirect convenience) · Zod validation · Prisma parameterised queries · secure headers · provider keys encrypted at rest · API keys stored hashed, shown once · audit log for sensitive actions · CSV export neutralises formula injection.

## Known gaps (honest list)
- **Not compiled/tested by the author** (see above). Expect to fix some type/lint errors on first run.
- **No migrations are committed** — generate with `prisma migrate dev` (needs a database).
- Password-reset **email is not sent** (`forgot-password/actions.ts` has an integration point; token generation/validation is implemented). No CSRF tokens beyond Next.js Server Actions' built-in origin check and SameSite cookies.
- API rate limiting is in-memory (per instance); use Redis for multi-instance.
- No login rate limiting / lockout yet; add before exposing publicly.
- Lists use "load latest N" or simple pagination on some pages (orders, transactions, reports); admin lists for users/orders/services are not fully paginated/sortable yet. TanStack Table/React Hook Form are not yet used.
- Not implemented: services bulk import/export and bulk price update, order refill/cancel from the retailer UI, Excel export, file upload/storage abstraction, distributor credit-limit UI (action exists), per-distributor API enable/permission toggles, drip-feed pricing nuances.
- Service performance/user-growth charts: only the revenue/profit chart is built.
