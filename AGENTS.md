<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Database Schema & Production Data Safety Rules (MANDATORY FOR ALL AGENTS)

Whenever making future updates, feature additions, or schema changes, **NEVER destroy, wipe, or overwrite existing user data**. Follow these non-negotiable rules:

### 1. Zero Data Loss Policy (Additive Migrations Only)
* **Never Drop Tables or Columns:** NEVER execute `DROP TABLE`, `TRUNCATE`, or `DROP COLUMN` on active production tables (`expenses`, `vendors`, `categories`, `profiles`).
* **Always Use `IF NOT EXISTS`:** When adding fields to Supabase PostgreSQL, always write additive migration scripts:
  ```sql
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS new_column_name DATA_TYPE DEFAULT default_value;
  ```
* **Provide Safe Defaults:** Any new required columns MUST include a sensible default (`DEFAULT 0`, `DEFAULT ''`, `DEFAULT false`) so existing rows remain valid.
* **Preserve Supabase RLS:** Keep the application's CRUD policies active so client sync and backend API routes never fail security checks.

### 2. Client-Side Dexie.js Versioning (`src/lib/db.ts`)
* If a new feature requires indexing a new field in the phone's local IndexedDB:
  * **DO NOT** edit existing `version(1)` or `version(2)` store definitions.
  * **DO** add a new incremental version block:
    ```typescript
    this.version(3).stores({
      expenses: 'clientUuid, paymentDate, categoryId, syncStatus, status, newField',
    });
    ```
  * Dexie will automatically upgrade the user's phone schema on next load **without deleting existing local expenses**.

### 3. Absolute Financial & Architecture Rules
* **Integer Paise Only:** All currency is strictly integer paise (`amountPaise BIGINT`). Never store floating-point currency in Dexie or Supabase.
* **Idempotency Guarantee:** Every expense MUST have a client-generated `clientUuid`. The sync route (`/api/sync/expenses`) uses `clientUuid` for deduplication and updates.
* **Audit Immutability & Super Admin Lock:**
  * Approved expenses (`verificationStatus === 'verified'`) are permanently locked for normal users.
  * Super Admin backdoor (5 taps on logo + PIN `573776`) is the only role that can override/delete locked expenses.
* **Bidirectional Sync Engine (`syncEngine.ts`):**
  * When adding new fields to `Expense`, update both `payload` in `syncPendingExpenses()` AND the update mapping in `pullRemoteExpenses()`.

### 4. Automated Database Migrations & Future Updates Workflow
* **Creating Migrations:** Place all new SQL scripts in `supabase/migrations/` using timestamp prefix (e.g. `20261115_004_add_feature.sql`).
* **Automated Execution:** Run `npm run db:migrate` from the terminal. The migration runner (`scripts/migrate.mjs`) automatically reads `DATABASE_URL` from `.env.local`, executes any unapplied migration files in a transaction, and marks them in `_migrations` table.
* **Never Ask User to Manually Run SQL:** Always use `npm run db:migrate` to apply schema updates directly from the terminal.
* **Testing Requirement:** Always run `npm test` (vitest) and `npx tsc --noEmit` before concluding any feature update.

