# Schema assumptions

Project: `jctjxtamsmtpdctsmrkp`. Everything below is **confirmed** against the live
project except the one item flagged at the end. `stores`, `products`, and the two
views were confirmed by reading real rows over the anon key. `profiles` was confirmed
by creating the real owner account (Nikhil) through the admin API and reading the row
back. `inventory`, `transactions`, and `daily_briefs` started out empty (no sales or
briefs existed yet), but PostgREST still names the exact missing column whenever a
`select` references one that doesn't exist — so a one-column-at-a-time probe nailed
the schema down without needing real rows, the same way a normal migration error
would. The `transactions` → `inventory` trigger's actual *behavior* (as opposed to
just its column names) has since been confirmed too, with a real sale recorded
through the live app — see the transactions entry below.

Everything that touches the database goes through `lib/data/*.ts` and
`lib/types/database.types.ts` — if the schema ever changes, fix it there; nothing
else should need to change.

## Confirmed tables/views

- **stores**: `id, name, location, type ('retail'|'wholesale'|'both'), created_at`.
  Three rows: Unique Retail (retail), Unique Wholesale (wholesale), Unique Sales /
  Shinai (**both**).
- **products**: `id, sku_code, brand, model, category, variant, color, description,
  retail_price, wholesale_price, barcode, image_url, low_stock_threshold, is_active,
  search_vector, created_at, updated_at`. 694 rows, matching the spec's SKU count.
  **No `name` column** — `model` carries the full messy display string (e.g.
  `"MATTE GLASS 1+10R"`), and `description` duplicates it in every sampled row. The
  app treats `model` as the product's name throughout (`lib/data/products.ts`'s
  `displayName()`), writing the same string into both `model` and `description` on
  create/update/import. `retail_price`/`wholesale_price` are nullable — **every
  product currently has both set to `null`** (no pricing pass has happened yet), so
  the app disables "Make Purchase" and shows "Price Not Set" until Manage → Products
  or a priced CSV import fills them in. `color` is null on every sampled row and
  isn't surfaced in the UI. Delete in Manage → Products does a soft delete
  (`is_active = false`), not a hard `DELETE`, since transactions will reference the
  row once sales exist.
- **stock_by_store** (view): one row **per product**, pivoted — `stock_retail,
  stock_wholesale, stock_shinai, stock_total, stock_status
  ('in_stock'|'low_stock'|'out_of_stock')` — not one row per (product, store).
  `lib/data/stores.ts`'s `stockColumnForStore()` maps each store to its pivot column
  by `type` (`retail`→`stock_retail`, `wholesale`→`stock_wholesale`, the one
  `'both'` store→`stock_shinai` by elimination). All 694 products currently only
  have `stock_wholesale` populated, matching the spec ("loaded into Unique Wholesale
  store").
- **low_stock_alerts** (view): `product_id, sku_code, brand, model, category,
  variant, color, store_name, current_stock, low_stock_threshold, last_movement_at`.
  Keyed by **`store_name`, not `store_id`**. 369 rows right now — every one of them
  in Unique Wholesale, every one at exactly 1 unit (see the Search verification
  note below; the generated brief flagged this pattern itself as worth Nikhil's
  attention).
- **profiles**: `id, full_name, role ('owner'|'manager'|'staff'), store_id,
  is_active, created_at, updated_at`. **No `email` column at all** — matches "login
  is name + PIN only" exactly. The real owner account exists: full_name "Nikhil",
  role "owner", store_id null, is_active true.
- **inventory**: `id, product_id, store_id, quantity, updated_at`.
- **transactions**: `id, product_id, store_id, user_id, type, quantity, price_type,
  unit_price, notes, created_at`. Two things differ from the original guess: the
  staff reference column is **`user_id`, not `staff_id`**, and **there is no stored
  total column** (`total_amount`/`total`/`amount`/`price` all probed as missing) —
  `unitPrice * quantity` is computed in app code (`lib/data/transactions.ts`) instead
  of read from the row. `type`'s actual check-constraint values weren't
  independently probed beyond confirming the column exists —
  `'sale'|'purchase'|'adjustment'` is carried over from the spec text as the
  working assumption (see the trigger-contract note below).

  **Pending migration:** the app code now also reads/writes `customer_name`,
  `customer_phone`, and `payment_method` (all confirmed absent — `notes` already
  existed and needed no migration). Run this in the Supabase SQL Editor before
  Make Purchase / History detail will work — until then, `/api/dashboard`,
  `/api/transactions`, and `POST /api/transactions` will 500 with
  `column transactions.customer_name does not exist` (confirmed live):

  ```sql
  ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
  ```

  **Migration applied and verified with a real sale** (2026-08-19): ran a live
  Make Purchase through the actual browser UI — MATTE GLASS IP 15PRO, 1 unit,
  Unique Wholesale, ₹199 via UPI, customer "Ramesh Patel" / phone / a note — and
  confirmed end to end: the `transactions` insert succeeded with all four new
  columns round-tripping correctly, the History detail sheet rendered every
  field including a working `tel:` link, and — closing out what had been the
  single biggest open assumption in this file — **the `transactions` →
  `inventory` trigger's behavior is now confirmed**: Wholesale's `inventory.quantity`
  for that product dropped from 40 to 39, exactly matching the 1-unit sale.
- **daily_briefs**: `id, brief_date, content, generated_at`. Timestamp column is
  **`generated_at`, not `created_at`**. A real brief has been generated for
  2026-08-18 through the actual pipeline (real Claude call, real data) — see below.

## The one thing still open

1. **`dead_stock` and `sales_velocity`** (views) — still genuinely empty (0 rows),
   since both depend on sales history that doesn't exist yet, so there was nothing
   to probe against even column-by-column. `lib/data/brief.ts` only ever does
   `.select('*')` on these and hands the raw rows to Claude, so the app doesn't
   break on either shape; they'll self-confirm the first time either view actually
   returns data.

## Other things worth knowing about

- **Auth is name + PIN, not email + PIN.** The PIN is stored purely as the Supabase
  Auth password on a synthetic `<uuid>@staff.unique.internal` address that
  `profiles` never stores and the UI never shows. Login is a "tap your name" roster
  (`GET /api/auth/roster`, public, name + id only) followed by a PIN pad
  (`POST /api/auth/login`, resolves the synthetic email server-side via
  `auth.admin.getUserById` and signs in). Verified end-to-end with the real owner
  account (PIN 1234) through the actual browser UI, not just a script.
- **"Variants available"** on the product detail panel: since `model` bakes the
  variant name into the same string as the device (e.g. `"MATTE GLASS 1+10R"`,
  `"BORDERLESS PRIVACY GLASS IP-15PRO"`), sibling variants are found by stripping a
  curated list of marketing-phrase terms (`MATTE GLASS`, `PRIVACY GLASS`,
  `SUPER D`, `BORDERLESS`, `BORDER LESS`, `UV GLASS`, `ONE MINUTE`, etc. — see
  `VARIANT_MARKETING_TERMS` in `lib/data/products.ts`) and all non-alphanumeric
  characters from `model`, then matching the normalized remainder against other
  rows in the same `category`+`brand`. Verified live in the browser against the
  spec's own iPhone 15 Pro example (UNQ-00015) — correctly shows Matte/Privacy/Super
  D Glass as available variants despite each using different wording in `model`.
  It's a string heuristic over free text, not a real relationship, so a `model`
  using an unlisted marketing phrase (e.g. a handful of rows carry an `ESD`
  qualifier) will fall back to showing just that product's own variant.
- **Search matching** does *not* use `products.search_vector` / Postgres full-text
  search, despite that looking like the obvious tool and the spec's `search_terms`
  field being described as "cleaned string for postgres full text search." Verified
  against the live catalog that it doesn't work here: `to_tsvector` stores runs
  like `"15PRO"` as one lexeme, so a query for `"15 pro"` — or Claude's own literal
  expansion of "ip15pro" per its shorthand-guide prompt into `"iPhone 15 Pro"` —
  matches **zero** rows against catalog text written `"IP 15PRO"` (`"iPhone"`
  never appears in the data; only the abbreviation `"IP"` does). Instead,
  `lib/data/products.ts`'s `scoredSearch()` runs each query token through its own
  chunked-ILIKE match (splitting on letter/digit boundaries so `"ip15pro"` matches
  `"IP 15PRO"`, `"IP-15PRO"`, or `"IP15PRO"` regardless of separator) against
  `stock_by_store` directly, ranked by how many tokens matched rather than
  requiring all of them. Verified in the actual browser UI: typing "matte ip15pro"
  surfaces "MATTE GLASS IP 15PRO" (UNQ-00015) as the top result with a live Claude
  call in the loop, matching the spec's own worked example exactly.
- **Wholesale store detection**: `getWholesaleStoreId` in `lib/data/stores.ts`
  matches on `store.type === 'wholesale'` (confirmed column) rather than a name
  string.
- **AI brief generation**: capped at 50 rows per section (`MAX_ROWS_PER_SECTION` in
  `lib/data/brief.ts`), sorted most-urgent-first, before being sent to Claude —
  sending all 369 raw low-stock rows blew past a 20s timeout budget (~22s, aborted).
  Timeout raised to 45s with `maxDuration = 60` on the route for headroom under
  Vercel's function limit. Verified end-to-end with the real Anthropic key against
  the live 369-row low-stock backlog: generated in ~38s, correctly grouped by
  UBON sub-category, and the `insight` field caught a real, non-obvious pattern —
  every one of the 369 alerts sitting at exactly 1 unit, all in Wholesale, which it
  flagged as looking like an unrecorded bulk dispatch rather than gradual
  depletion.
