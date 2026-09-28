# Public REST API (v1)

Base URL: `{APP_URL}/api/v1`. Authenticate with `key` (query string or form field). Create keys under **API** in your panel; the full key is shown once.
Keys support an IP whitelist and per-minute rate limit. Errors return `{ "error": "message" }` with an HTTP status (400/401/403/404/429/500).
Rates are per 1,000 units in `INR` (see `lib/brand.config.ts`).

## GET|POST /services
Returns active services priced for the calling account (Distributor or Retailer price). Provider details and cost are never included.
```json
[{ "service": 101, "name": "Example Service", "rate": "100.0000", "min": "100", "max": "100000",
   "category": "Instagram Followers", "type": "default", "description": "…",
   "dripfeed": true, "refill": true, "cancel": true }]
```
## GET|POST /balance
`{ "balance": "1234.5000", "currency": "INR" }`

## POST /orders  (Retailer accounts)
Fields: `key`, `service` (service ID), `link`, `quantity`, optional `runs`, `interval`, `comments`. Send an `Idempotency-Key` header to make retries safe (a repeat returns the same order, no second charge).
Response: `{ "order": 23501 }`

## GET /orders/{order}
`{ "charge": "0.0330", "start_count": "1691", "status": "COMPLETED", "remains": "0", "currency": "INR" }`
Status values: `PENDING, PROCESSING, IN_PROGRESS, COMPLETED, PARTIAL, CANCELLED, REFUNDED, FAILED`.

## GET /orders
Latest 100 orders: `[{ "order", "charge", "start_count", "status", "remains" }]`.

Not implemented in v1: order refill/cancel endpoints.
