v # Data Layer Implementation — COMPLETED ✅

## Files Created (10)
- [x] `src/shared/format.ts` — `formatPKR(paisa: number): string` helper
- [x] `src/main/db/migrations/001_initial.sql` — All 7 tables + schema_version
- [x] `src/main/db/database.ts` — Config management, DB init, WAL mode, migrations runner, quit handler
- [x] `src/main/db/productsRepo.ts` — Typed CRUD for products
- [x] `src/main/db/phonesRepo.ts` — Typed CRUD for phones
- [x] `src/main/db/customersRepo.ts` — Typed CRUD for customers with outstanding balance query
- [x] `src/main/db/salesRepo.ts` — CRUD for sales + sale_items with inventory/status updates
- [x] `src/main/db/purchasesRepo.ts` — CRUD for purchases
- [x] `src/main/db/customerPaymentsRepo.ts` — CRUD for customer_payments
- [x] `scripts/seed.ts` — Dev seed script with realistic sample data

## Files Modified (4)
- [x] `package.json` — Added `better-sqlite3` dependency + `"seed": "tsx scripts/seed.ts"` script
- [x] `src/shared/types.ts` — Added `DbConfig` interface, updated `DesktopApi` with db methods
- [x] `src/main/index.ts` — Integrated database init, IPC handlers, dev verification log
- [x] `src/preload/index.ts` — Exposed db IPC methods via contextBridge

## Key Design Decisions Implemented
- All money stored as INTEGER paisa (never float)
- Customer balance is DERIVED (sum of udhaar sales minus payments), never stored
- WAL mode on open, TRUNCATE checkpoint on quit
- Versioned SQL migrations tracked in schema_version table
- Repository pattern — no raw SQL in IPC handlers
- First-run setup: config.json in userData stores chosen dataPath
- Default path: `D:\MobileHubPOS\` (fallback to `Documents\MobileHubPOS`)
- `sale_items` CHECK constraint ensures exactly one of product_id/phone_id is set
- TypeScript typecheck passes with no errors
