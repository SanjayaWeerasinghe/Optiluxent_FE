# Playwright E2E Findings Report

Date: 2026-06-29
Suite: 15 specs across `auth`, `procurement`, `sales`, `manufacturing`, `inventory`.
Result: **15/15 passing** after the fixes documented below.

The Playwright suite drives the React UI through the running stack
(`http://localhost:5173` → `http://localhost:3000`). It exists to verify that the
frontend issues the right API payloads with the right field types, that form
validation matches backend constraints, and that auto-link side effects
(SO→SI, PO→PINV, GRN→QC) propagate correctly to the UI.

Below is the list of real bugs the tests uncovered, in the order they were
found.

---

## FE-1 — Login page took ~6.4 s cold

**Cause**: `src/router/index.tsx` eagerly imported every module page
(`ProcurementPage`, `InventoryPage`, etc.). The Vite dev server in turn fetched
the entire dependency graph (~70 requests, 2.7 MB) before `/login` could render.

**Fix**: `React.lazy()` per route + `<Suspense fallback>`. Vite `optimizeDeps.include`
+ `server.warmup` so common deps are prebundled at startup.

**Result**: Cold to login form 6.4 s → **791 ms**.

---

## FE-2 — Material Symbols web font added several MB and seconds to load

**Cause**: `src/index.css` used `@import url(https://fonts.googleapis.com/…Material+Symbols…)`.
That blocks render until the variable font downloads.

**Fix**: Replaced `Icon.tsx` with an inline Heroicons SVG map (paths copied
verbatim from heroicons.com). The Material Symbols font is gone; only Inter
remains. Test environment also routes off `fonts.*.com` requests so suites
don't depend on external network.

---

## FE-3 — Auth router froze the localStorage snapshot at app boot

**Cause**: `requireAuth()` was a plain function called at module-evaluation
time, capturing whatever `localStorage.getItem('access_token')` returned then.
A user who logged in during a fresh app session would still hit `<Navigate to="/login"/>`
on `/` until a full page reload, because the captured snapshot never refreshed.

**Fix**: Converted to a real `<RequireAuth>` React component that reads
`localStorage` at render time.

---

## FE-4 — GRN form had no `grn_type` dropdown

**Cause**: We added `grn_type` (`WITH_PO` / `WITHOUT_PO` / `CUSTOMER_RETURN` /
`PRODUCTION_RETURN`) to the backend in the previous session, but the FE
`GRNSection.tsx` never exposed the field — meaning users could only create
`WITH_PO` GRNs (the default fallback).

**Fix**: Added a `GRN Type` select to `GRN_HEADER` and a column to `GRN_COLS`.

---

## FE-5 — DocDetailModal sent empty strings for unselected line-item fields

**Cause**: The header save path stripped empty-string fields before POSTing
(line 144). The line-item save path did not. Result: `discount_pct: ""` and
`tax_code_id: ""` reached the backend, which rejected the request with
`invalid request body` because Go's JSON decoder cannot bind `""` to
`float64` or `*uint`.

**Evidence**: Captured payload via Playwright `page.on('request')`:
```
POST /api/v1/sales/sales-orders/{id}/items
{"product_id":8,"description":"","quantity":100,"uom_id":8,
 "unit_price":280,"discount_pct":"","tax_code_id":"","notes":""}
→ 400 { "code": "BAD_REQUEST", "message": "invalid request body" }
```

**Fix**: `DocDetailModal.handleSave` now filters empty-string entries from each
line body, mirroring the header logic. Post-fix payload:
```
{"product_id":8,"quantity":100,"uom_id":8,"unit_price":280}
→ 201 Created
```

---

## BE-1 — DO confirm couldn't price SI lines without a `so_line_id` link

**Cause**: `appendDOLinesToDraftInvoice` in `sales/service.go` only resolved the
SO line price when `do_line.so_line_id` was set. The FE doesn't expose
`so_line_id` on the DO line form, so this field is always nil → unit_price
defaulted to 0 → SI total stayed at 0 even after a full delivery confirm.

**Fix**: Added a fallback in the BE — if `so_line_id` is nil, match the SO
line by `product_id` within the same SO. Price/tax/discount inherit
correctly without the FE needing a new field.

**Verification**: SI auto-created for SO22 now shows total LKR 16,800
(60 PKT × LKR 280) after DO confirm.

---

## DB-1 — Several `_lines` tables missing `created_at`/`updated_at`

**Cause**: GORM models for `MRLine`, `GoodsTransferLine`, `GoodsIssueLine`,
`StockAdjustmentLine` (and earlier `QCLine`) declare `CreatedAt`/`UpdatedAt`
fields, but the Postgres tables don't have those columns. Every INSERT
failed with `ERROR: column "created_at" of relation "..._lines" does not exist`.

**Fix**: Migration `000030_inventory_line_timestamps` (companion to the
earlier `000029` for `quality_check_lines`) adds the columns with sensible
defaults.

---

## Test infrastructure decisions

| Concern | Choice |
|---|---|
| Selector strategy | `data-testid` on stable UI primitives: `doc-modal`, `doc-save`, `workflow-{action}`, `field-{key}`, `line-field-{key}`, `line-add`, `line-add-confirm` |
| Auth flow | Spec uses `loggedInPage` fixture that mints an API token then writes it to `localStorage` before navigation. The login form itself is exercised separately in `auth.spec.ts` |
| Arrange step | Specs hit the API directly (via authenticated `request.newContext`) for arrange-time seeding, then exercise the UI for the assert step |
| Unique codes | `e2e/fixtures/test-data.ts` generates unique codes per run (`SO-E2E-12345`) so reruns don't collide on `(tenant_id, code)` unique constraints |
| External resources | Google Fonts requests aborted in tests — icons are now inline SVGs, only Inter falls back to system sans |

## Selector helpers (see `e2e/fixtures/selectors.ts`)

`gotoSection`, `clickNewRecord`, `fillField`, `selectField`, `fillLineField`,
`selectLineField`, `addLine`, `saveDoc` (with error-surfacing on failure),
`runWorkflow` (with error-surfacing on failure), `openDocByCode`, `rowByCode`,
`expectRowStatus`.

## Coverage matrix

| Spec | Module | Flow |
|---|---|---|
| `auth.spec.ts` | auth | Login → dashboard; pre-authed fixture works on protected route |
| `pr-lifecycle.spec.ts` | procurement | DRAFT → submit → approve, reject, cancel (3 tests) |
| `po-and-autoinvoice.spec.ts` | procurement | PO create → draft PINV auto-created |
| `grn-with-po-qc.spec.ts` | procurement | GRN WITH_PO → Material QC PENDING → stock gated → grade PASSED → stock posts |
| `grn-without-po.spec.ts` | procurement | Ad-hoc GRN → Material QC auto-created |
| `grn-return-direct-stock.spec.ts` | procurement | CUSTOMER_RETURN → no QC → stock posts immediately |
| `so-do-si-autolink.spec.ts` | sales | SO → draft SI → DO confirm → SI lines populated → post SI |
| `output-qc.spec.ts` | manufacturing | Production output → Product QC → FAILED → stock unchanged |
| `qc-partial.spec.ts` | inventory | QC PARTIAL → only qty_passed posts to stock_balance |
| `mr-transfer-issue.spec.ts` | inventory | Material Request approve, Goods Transfer send/receive, Goods Issue confirm (3 tests) |

Total: **15 tests**, all green at the time of writing.
