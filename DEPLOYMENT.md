# Deployment

1. Provision PostgreSQL; set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `ENCRYPTION_KEY` (32 bytes base64), `CRON_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL` in the host's secret store — never commit `.env`.
3. `npm ci && npx prisma migrate deploy && npm run build && npm start` (Node 20). Do **not** run the seed in production.
4. Put the app behind HTTPS (session cookies are `secure` in production) and a reverse proxy that sets `X-Forwarded-For` truthfully (used for IP whitelisting/audit).
5. Schedule `curl -X POST -H "x-cron-secret: $CRON_SECRET" $APP_URL/api/internal/sync-orders` every 1–5 minutes.
6. Multi-instance: replace the in-memory API rate limiter with Redis; use shared storage for uploads.
7. Create the first real admin manually (change/remove seed accounts), then add providers in Admin → Providers.
8. Backups: enable PITR/daily dumps — the wallet ledger is your financial record.
