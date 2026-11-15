# Soul Dive Expense Manager

## Product Requirements Document (PRD) and Agentic Coding Specification

**Project:** Soul Dive Water Park --- Expense Manager\
**Document version:** 1.0\
**Purpose:** Build a production-minded, mobile-first, offline-first
expense tracking application for the Soul Dive Water Park project and
its future operations.

------------------------------------------------------------------------

## 1. Product vision

Build a simple expense recording system that allows the owner's father
and other authorized people to record every payment immediately from
their phones, even when internet connectivity is unavailable.

The system must eliminate dependence on someone remembering expenses at
the end of the day. It must provide a reliable central ledger, receipt
storage, reconciliation workflows, and automatic daily, monthly,
category-wise, vendor-wise, person-wise, and lifetime reporting.

The primary user is not highly technical. Therefore, recording an
expense must be extremely simple, fast, and understandable.

### Core product principles

1.  **Capture first:** Recording an expense should take approximately
    20--30 seconds.
2.  **Offline-first:** An expense must be saved locally when there is no
    internet and synchronized when connectivity returns.
3.  **One shared source of truth:** All authorized users contribute to
    the same central ledger.
4.  **Auditability:** Never silently overwrite or delete financial
    records.
5.  **Simple for staff, powerful for management:** The entry interface
    should be minimal; reporting and controls can be comprehensive.
6.  **Lifetime use:** Support construction, pre-opening, and ongoing
    operations without needing a redesign.
7.  **No fabricated financial data:** All reports must be based on
    actual recorded transactions and clearly show sync/verification
    status.

------------------------------------------------------------------------

## 2. Target users and roles

The app must support multiple users.

### Roles

  -----------------------------------------------------------------------
  Role                                Permissions
  ----------------------------------- -----------------------------------
  Owner / Administrator               Full access, invite and deactivate
                                      users, manage categories, view all
                                      reports, approve edits, export data

  Manager                             View all transactions and reports,
                                      add expenses, review and flag
                                      transactions; limited settings
                                      access

  Expense Contributor                 Add expenses, attach receipts, view
                                      own submissions and sync status

  Viewer / Accountant                 Read-only access to transactions,
                                      reports, receipts, and exports
  -----------------------------------------------------------------------

The initial deployment may use the owner and a small number of
contributors. The role system must be designed so more users can be
added later.

### User identity

Every transaction must record: - User who submitted the transaction. -
Actual payer, if different from the submitter. - Submission timestamp. -
Payment date and time (which may differ from submission time). -
Device-generated unique transaction ID. - Sync status. - Verification
status.

Do not rely only on a free-text "Paid by" field. Use authenticated user
identity plus an optional "Paid by" selector.

------------------------------------------------------------------------

## 3. Supported platforms and experience

### Primary delivery

Build an installable **Progressive Web App (PWA)**: - Works on Android
phones, iPhones, tablets, and desktop browsers. - Can be added to the
home screen. - Responsive, touch-friendly interface. - HTTPS required in
production. - App shell and essential screens available offline after
the first successful load.

### Language

-   Hindi-first interface for the primary expense contributor.
-   English language option for administrators and reports.
-   Use simple everyday Hindi, not formal or technical Hindi.
-   Use familiar numerals and Indian currency formatting.
-   Design text so that Hindi and English can be switched without losing
    data.

### Accessibility and usability

-   Large buttons and input controls.
-   High contrast and readable font sizes.
-   Minimal typing.
-   Clear validation messages in Hindi.
-   Avoid crowded screens, complex menus, and accounting jargon.
-   Provide voice typing through the device keyboard where supported. Do
    not promise offline speech recognition; availability depends on the
    browser, operating system, and keyboard.

------------------------------------------------------------------------

## 4. Main application modules

1.  Authentication and user management
2.  Quick expense entry
3.  Expense ledger
4.  Receipt and document storage
5.  Categories, vendors, projects, and phases
6.  Dashboard and analytics
7.  Daily reconciliation
8.  Advances and settlements
9.  Reports and exports
10. Offline queue and synchronization
11. Audit log and data backup
12. Settings

------------------------------------------------------------------------

## 5. Expense entry --- most important workflow

The expense form must be optimized for a non-technical user.

### Quick-entry fields

Required: - Amount (INR) - Purpose / description - Category - Payment
method - Payment date

Recommended: - Vendor / paid to - Project phase - Paid by (defaults to
signed-in user) - Receipt photo or file - Notes

System-generated: - Transaction ID - Submitted by user ID - Created
timestamp - Last updated timestamp - Device ID or installation ID
(non-identifying random ID) - Sync status - Verification status

### Form behavior

-   Amount field opens a numeric keyboard on mobile.
-   Show Indian currency format, e.g. ₹5,000.
-   Description supports device voice typing.
-   Category is a searchable dropdown with common options at the top.
-   Payment method options: Cash, UPI, Bank Transfer, Debit/Credit Card,
    Cheque, Other.
-   Date defaults to current local date but can be changed.
-   Submission must work offline.
-   Show a clear success state immediately after local save, even if
    cloud sync is pending.
-   Do not show "Synced" until the server confirms successful
    synchronization.
-   Prevent accidental double submission by disabling the submit action
    while saving and using an idempotency key.
-   Allow saving an expense without a receipt; receipt can be attached
    later.
-   Make receipt upload optional but encourage it for material purchases
    and larger payments.
-   Provide a "Save and add another" action for users entering several
    expenses in sequence.

### Optional simplified entry mode

Provide a "Very Simple Entry" mode with only: 1. Amount 2. What was it
for? 3. Category 4. Save

Payment method, payer, date, vendor, phase, and receipt can be filled
from defaults or added under "More details." Do not sacrifice audit
fields: system identity and timestamps are always captured.

### Example

A contributor enters: - Amount: ₹5,000 - Purpose: Cement purchase -
Category: Construction Material - Payment method: UPI - Paid to: Sharma
Traders - Phase: Construction - Receipt: photo

The app saves locally immediately and synchronizes later.

------------------------------------------------------------------------

## 6. Lifetime categories and project phases

Categories must be editable by administrators. Seed the application with
the following categories.

### Construction and setup

-   Land and Site Development
-   Survey and Soil Testing
-   Civil Construction
-   Bricks, Cement, Steel and Aggregates
-   Plumbing and Water Systems
-   Electrical and Generator
-   Waterpark Equipment
-   Slides and Attractions
-   Filtration and Treatment Plant
-   Machinery and Tools
-   Labour and Contractors
-   Transportation and Logistics
-   Architecture and Consultancy
-   Furniture and Interiors
-   Landscaping
-   Safety Equipment
-   Government Fees and Approvals
-   Insurance
-   Pre-opening Marketing
-   Other Construction Expenses

### Operations

-   Salaries and Wages
-   Electricity
-   Water and Utilities
-   Repairs and Maintenance
-   Cleaning and Housekeeping
-   Chemicals and Water Treatment
-   Costumes and Inventory
-   Food and Beverage Inventory
-   Marketing and Advertising
-   Ticketing and Payment Charges
-   Security
-   Insurance and Compliance
-   Office and Administration
-   Transport and Fuel
-   Guest Services
-   Other Operating Expenses

### Financial / administrative

-   Professional Fees
-   Bank Charges and Interest
-   Taxes and Statutory Payments
-   Refunds
-   Advances Given
-   Other

### Project phases

Every expense should have one phase: - Construction - Pre-opening -
Operations - Expansion / Renovation

Allow administrators to add future phases.

**Important accounting distinction:** Advances given to contractors or
suppliers should not automatically be treated as a final expense if they
are later adjusted against invoices. Track them as advances until
settled, while showing cash outflow separately from recognized expense.

------------------------------------------------------------------------

## 7. Expense ledger

Create a central searchable ledger with: - Date - Description -
Category - Vendor - Amount - Payment method - Paid by - Submitted by -
Phase - Receipt indicator - Sync status - Verification status

### Ledger features

-   Search by description or vendor.
-   Filter by date range, category, phase, payment method, payer,
    submitter, vendor, and status.
-   Sort newest/oldest and highest/lowest amount.
-   Pagination or virtualized list for large datasets.
-   Open transaction details.
-   Add receipt to an existing transaction.
-   Request correction rather than silently overwriting a verified
    record.
-   Export filtered records to CSV/XLSX/PDF.

### Editing and deletion policy

Financial records must be auditable: - Contributors may edit their own
unverified entries for a limited period, e.g. 24 hours. - After
verification, edits require manager/admin approval. - Do not hard-delete
financial transactions. - Use void/reversal entries with a reason and
link to the original transaction. - Maintain before/after values in an
audit log.

------------------------------------------------------------------------

## 8. Dashboard and reporting

Dashboard should show only real data from the database.

### Main metrics

-   Total recorded cash outflow
-   Total recognized expenses (excluding unsettled advances where
    appropriate)
-   This month's expenses
-   Today's expenses
-   Transaction count
-   Pending sync count (device-local)
-   Pending verification count
-   Expenses without receipts
-   Cash balance / cash movement only if opening balances and all cash
    movements are recorded

Clearly distinguish **recorded expenses**, **cash outflow**,
**advances**, and **verified expenses**. Do not label total expenses as
project investment or total project cost unless that is explicitly
configured.

### Charts and breakdowns

-   Monthly spending trend
-   Category-wise expenses
-   Phase-wise expenses
-   Vendor-wise spending
-   Payment-method breakdown
-   Payer-wise and submitter-wise breakdown
-   Daily spending
-   Top vendors
-   Expenses with and without receipts

### Filters

-   Today
-   Yesterday
-   This week
-   This month
-   Previous month
-   Financial year
-   Custom date range
-   Phase
-   Category
-   User
-   Vendor
-   Payment method
-   Verification status

### Date and timezone

-   Store timestamps in UTC on the server.
-   Display dates in Asia/Kolkata (India Standard Time).
-   Keep payment date distinct from record submission timestamp.
-   Support backdated transactions without changing the submission
    timestamp.

------------------------------------------------------------------------

## 9. Offline-first architecture and synchronization

This is a core requirement, not a later enhancement.

### Expected offline behavior

After the app has been opened online at least once and
installed/cached: - User can open the app shell offline. - User can
create expenses offline. - Offline expenses are stored locally. - User
can view locally stored and previously synchronized records cached on
that device. - User can attach receipt photos offline; files remain in a
local pending-upload queue. - When connectivity returns, the app
synchronizes queued records and receipt files. - User can see pending,
syncing, synced, and failed states.

### Recommended client-side technology

-   Service Worker for app-shell caching.
-   IndexedDB for structured offline data and pending actions.
-   A well-maintained library such as Dexie.js for IndexedDB.
-   Background Sync where supported, with a foreground retry fallback.
-   Persistent local queue with retry/backoff.
-   Never depend exclusively on Background Sync because browser support
    varies.

### Sync design

Each locally created transaction must have: - UUID generated on
device. - `created_at_device` - `payment_date` -
`submitted_by_user_id` - `sync_status` - `server_created_at` after
successful sync - `last_sync_attempt_at` - `sync_error` if applicable

Use idempotent upserts keyed by UUID so retrying the same transaction
cannot create duplicates.

Sync algorithm: 1. Detect online state and app startup/resume. 2. Read
pending local transactions in creation order. 3. Send transaction
payload with its UUID. 4. Server checks whether UUID already exists. 5.
If not, create record; if yes, return existing record. 6. Mark local
transaction synced only after server confirmation. 7. Upload pending
receipt files and link them to the transaction. 8. Retry temporary
failures with exponential backoff. 9. Preserve unsynced data if
authentication expires; prompt user to sign in again when online. 10.
Show a persistent warning if sync fails for a prolonged period.

### Conflict handling

-   Avoid last-write-wins for financial records.
-   Treat each expense as an append-first record.
-   Use correction requests or revision records for changes.
-   Keep audit history.
-   If two devices edit the same record, flag a conflict for admin
    review.
-   Never discard local pending records because a server version exists.

### Local data safety

-   Request persistent storage where supported.
-   Warn users not to clear browser data while pending sync exists.
-   Show a visible pending-sync badge.
-   Provide a manual "Sync now" action.
-   Keep server backups and provide exports.
-   Explain that local offline data can still be lost if the browser/app
    data is cleared, the device is lost, or storage is evicted before
    synchronization. Do not claim offline storage is an absolute backup.

### Receipt storage offline

-   Store pending receipt blobs in IndexedDB.
-   Compress/resize images client-side where practical, preserving
    legibility.
-   Upload when online.
-   Show upload progress and failure state.
-   Enforce configurable file size and type limits.
-   Validate file types server-side.
-   Do not expose receipt files publicly; use authenticated access or
    signed URLs.

------------------------------------------------------------------------

## 10. Authentication and access control

Recommended: - Email/password or phone OTP authentication depending on
provider support and cost. - Admin creates/invites contributors. - No
public self-registration. - Session persistence appropriate for a shared
family/business environment. - Ability to deactivate a user without
deleting their historical transactions. - Role-based authorization
enforced on the server/database, not only in the UI. - Secure password
reset or OTP recovery. - Require reauthentication for sensitive admin
actions.

Do not store passwords in plaintext or implement custom cryptography.

------------------------------------------------------------------------

## 11. Suggested technology stack

Use a modern, maintainable TypeScript stack.

### Recommended stack

  -----------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------
  Frontend                            Next.js + React + TypeScript

  Styling                             Tailwind CSS

  UI components                       Accessible component library
                                      (e.g. shadcn/ui)

  Forms                               React Hook Form + Zod

  Offline database                    IndexedDB + Dexie.js

  PWA                                 Web App Manifest + Service Worker
                                      (e.g. Serwist or a maintained
                                      equivalent)

  Backend / database                  Supabase (PostgreSQL)

  Authentication                      Supabase Auth

  Receipt storage                     Private Supabase Storage bucket

  Charts                              Recharts

  Date handling                       date-fns with Asia/Kolkata timezone
                                      support

  Hosting                             Vercel or another HTTPS-capable
                                      host

  Testing                             Vitest + Playwright
  -----------------------------------------------------------------------

The coding agent may propose an equivalent stack, but it must preserve
the offline-first, relational database, access-control, and audit
requirements.

### Why a relational database?

Expenses have relationships with users, categories, vendors, phases,
receipts, and corrections. PostgreSQL provides strong consistency and
reporting capabilities.

### Cost considerations

Start with free tiers where practical, but check current provider quotas
and pricing before production. Do not assume free tiers are sufficient
forever. Include a cost and quota review in deployment documentation.

------------------------------------------------------------------------

## 12. Suggested database schema

Use migrations. Include `created_at` and `updated_at` where relevant.
Use numeric/decimal types for money, never floating-point types.

### `profiles`

-   `id` UUID, primary key, references auth user
-   `full_name`
-   `phone` nullable
-   `role` enum: owner, manager, contributor, viewer
-   `is_active` boolean
-   `preferred_language` enum: hi, en
-   `created_at`
-   `updated_at`

### `expenses`

-   `id` UUID, primary key (server ID)
-   `client_uuid` UUID, unique, required for idempotency
-   `amount_paise` BIGINT, positive integer
-   `currency` CHAR(3), default INR
-   `description` TEXT
-   `category_id` UUID
-   `vendor_id` UUID nullable
-   `phase_id` UUID
-   `payment_method` enum/string
-   `payment_date` DATE
-   `payment_time` TIME nullable
-   `paid_by_user_id` UUID nullable
-   `submitted_by_user_id` UUID
-   `notes` TEXT nullable
-   `record_type` enum: expense, advance, refund, reversal
-   `status` enum: active, voided
-   `verification_status` enum: pending, verified, rejected,
    needs_correction
-   `verified_by_user_id` UUID nullable
-   `verified_at` TIMESTAMPTZ nullable
-   `created_at` TIMESTAMPTZ
-   `updated_at` TIMESTAMPTZ
-   `device_created_at` TIMESTAMPTZ nullable

Store INR amounts in paise as integer values (₹1 = 100 paise) to avoid
rounding errors. Display rupees in the UI.

### `categories`

-   `id` UUID
-   `name_en`
-   `name_hi`
-   `parent_id` UUID nullable
-   `is_active`
-   `sort_order`
-   `created_at`

### `project_phases`

-   `id` UUID
-   `name_en`
-   `name_hi`
-   `is_active`
-   `sort_order`

### `vendors`

-   `id` UUID
-   `name`
-   `phone` nullable
-   `address` nullable
-   `notes` nullable
-   `created_at`

### `receipts`

-   `id` UUID
-   `expense_id` UUID
-   `storage_path`
-   `original_filename`
-   `mime_type`
-   `size_bytes`
-   `uploaded_by_user_id`
-   `created_at`

### `expense_revisions`

-   `id` UUID
-   `expense_id` UUID
-   `requested_by_user_id`
-   `approved_by_user_id` nullable
-   `old_values` JSONB
-   `new_values` JSONB
-   `reason`
-   `status` enum: pending, approved, rejected
-   `created_at`
-   `resolved_at` nullable

### `audit_logs`

-   `id` UUID
-   `actor_user_id` UUID nullable
-   `action`
-   `entity_type`
-   `entity_id`
-   `before_data` JSONB nullable
-   `after_data` JSONB nullable
-   `created_at`

### `cash_sessions` (optional but recommended for reconciliation)

-   `id` UUID
-   `opening_balance_paise`
-   `closing_balance_paise` nullable
-   `opened_by_user_id`
-   `closed_by_user_id` nullable
-   `opened_at`
-   `closed_at` nullable
-   `notes`

### `reconciliations`

-   `id` UUID
-   `date`
-   `payment_method`
-   `expected_total_paise`
-   `actual_total_paise`
-   `difference_paise`
-   `performed_by_user_id`
-   `notes`
-   `created_at`

Add indexes on: - `payment_date` - `category_id` - `phase_id` -
`vendor_id` - `submitted_by_user_id` - `paid_by_user_id` -
`verification_status` - `client_uuid` unique - `created_at`

Use foreign keys and appropriate delete restrictions. Do not
cascade-delete financial history.

------------------------------------------------------------------------

## 13. Accounting and reporting rules

This is an expense tracker, not a full accounting/ERP system.

-   Keep actual payment date separate from entry date.
-   Track cash outflow separately from expense recognition.
-   Advances should be visible as money paid but not double-counted as
    final expense when the invoice is later recorded.
-   Refunds and reversals should be separate linked records, not
    negative edits to old records.
-   Do not treat transfers between the business's own accounts as
    expenses.
-   Support splitting one bill across multiple categories in a future
    iteration; for MVP, either support line items or clearly document
    that one transaction has one primary category.
-   Show unverified and incomplete records separately.
-   Do not infer missing expenses.
-   Reports should state their date range, currency, applied filters,
    and whether they include pending/unverified entries.

For any "budget vs actual" feature, budgets must be explicitly entered
and not inferred.

------------------------------------------------------------------------

## 14. Security and privacy requirements

-   Enforce row-level security (RLS) or equivalent server-side
    authorization.
-   Contributors can create records and access only the data permitted
    by their role.
-   Only admins/managers can verify or void records.
-   Private receipt bucket; no public file URLs.
-   Validate and sanitize all inputs.
-   Use parameterized queries / ORM protections.
-   Rate-limit authentication and sensitive endpoints.
-   Protect against CSRF/XSS and unsafe file uploads.
-   Do not put service-role secrets in frontend code.
-   Use environment variables for secrets.
-   Log admin actions.
-   Provide a data export and account deactivation process.
-   Never expose one user's credentials to another user.

------------------------------------------------------------------------

## 15. Notifications and reminders

MVP: - In-app warning for unsynced transactions. - In-app list of
entries missing receipts. - Dashboard count for pending verification. -
Daily reconciliation checklist.

Later: - Optional WhatsApp or email reminder to contributors who have
pending offline records or incomplete submissions. - Scheduled daily
summary to the owner. - Do not send financial details to unauthorized
recipients.

Do not make WhatsApp automation a dependency for the initial product.

------------------------------------------------------------------------

## 16. MVP scope and development phases

### Phase 1 --- Reliable expense capture

Must deliver: - Authentication - Admin and contributor roles -
Hindi/English interface - Quick expense form - Categories and phases -
Multiple users - Online database persistence - Ledger and filters -
Receipt upload - Basic dashboard - CSV export - Audit trail for
edits/voids

### Phase 2 --- Offline-first support

Must deliver: - PWA installation - Service worker and app shell
caching - IndexedDB local persistence - Offline expense creation -
Offline receipt queue - Idempotent synchronization - Retry and conflict
handling - Pending/synced/failed indicators - Manual sync - Offline
tests on supported browsers

Do not call the product offline-capable until these tests pass.

### Phase 3 --- Financial control

-   Daily reconciliation
-   Cash opening/closing balance
-   Advance and settlement tracking
-   Verification workflow
-   Monthly PDF/XLSX reports
-   Budget vs actual
-   Vendor summaries
-   Receipt completeness reports

### Phase 4 --- Future operations

-   Recurring expense support
-   Payroll summaries (not full payroll)
-   Inventory purchase tracking
-   Maintenance records
-   Multiple projects/expansion areas if required
-   Optional integrations

------------------------------------------------------------------------

## 17. Required screens

1.  Login
2.  Home dashboard
3.  Add expense --- quick mode
4.  Add expense --- detailed mode
5.  Expense saved confirmation
6.  Expense ledger
7.  Expense detail
8.  Attach receipt
9.  Pending sync queue
10. Reconciliation
11. Reports
12. User management
13. Category and phase management
14. Vendor management
15. Settings / language
16. Offline / sync status screen

### Home screen priority

For contributors, the home screen should prioritize: - Large "Add
Expense" button - "My recent entries" - Sync status - "Sync now" if
pending

For admins, prioritize: - Total expenses - This month's expenses -
Today's expenses - Pending sync (where available per device) - Pending
verification - Quick filters and reports

Remember: pending offline records on another person's device cannot be
visible to the admin until they sync.

------------------------------------------------------------------------

## 18. Acceptance criteria

The app is not complete until the following tests pass.

### Expense capture

-   A contributor can add a valid expense in under 30 seconds in the
    normal flow.
-   Amount must be greater than zero.
-   Required fields show understandable Hindi validation.
-   Payment date can be backdated.
-   Submission identity and timestamp are automatically recorded.
-   Double tapping submit does not create duplicate transactions.

### Multi-user

-   Two different users can sign in on separate devices.
-   Both can submit expenses.
-   Admin can identify who submitted each transaction.
-   Deactivated users cannot sign in but their historical transactions
    remain.

### Offline

-   Install/open app online once.
-   Turn off internet.
-   Create multiple expenses.
-   Close and reopen the app while offline.
-   Verify expenses remain visible locally.
-   Restore internet.
-   Verify records sync exactly once.
-   Verify receipt files upload and link correctly.
-   Simulate failed sync and confirm retry.
-   Verify user sees clear pending and failed states.
-   Verify local pending data is not removed after a failed request.

### Reports

-   Daily and monthly totals match independently calculated test data.
-   Category and phase totals reconcile with filtered ledger totals.
-   Advances are not double-counted as final expenses.
-   Refunds/reversals are reflected correctly.
-   Date filters respect India time zone.

### Security

-   Contributor cannot access admin-only functions.
-   Contributor cannot verify or void records.
-   Private receipt files cannot be accessed by unauthenticated users.
-   Database RLS policies are tested, not merely enabled.
-   Secrets are absent from frontend bundles and source control.

### Reliability

-   Database migrations can be applied to a clean environment.
-   Automated tests run in CI.
-   Backup and restore procedure is documented.
-   Production deployment uses HTTPS.
-   Error monitoring and basic operational logs are configured.

------------------------------------------------------------------------

## 19. Testing strategy

Use: - Unit tests for amount formatting, totals, date filters, and sync
state transitions. - Integration tests for database access,
authorization, and idempotent sync. - Playwright end-to-end tests for
mobile and desktop workflows. - Offline tests by simulating browser
offline mode. - Tests for duplicate submission, retry, partial receipt
upload, expired authentication, and conflicting edits. - Test Indian
currency formatting and Asia/Kolkata date boundaries.

Seed demo data only in development. Clearly label demo data and ensure
production starts with no fabricated transactions.

------------------------------------------------------------------------

## 20. Deployment and handover

The coding agent must provide: - Complete source code. - README with
local setup instructions. - `.env.example` with variable names only, no
secrets. - Database migrations and seed scripts. - RLS/security
policies. - PWA manifest and service worker configuration. - Automated
tests. - Deployment instructions. - Admin setup instructions. -
Contributor onboarding instructions in simple Hindi. - Backup and
restore instructions. - Data export instructions. - Known limitations
and provider costs/quotas. - A clear explanation of how to
add/deactivate users and categories.

Do not claim the app is deployed, connected, or production-ready unless
those steps have actually been completed and verified.

------------------------------------------------------------------------

## 21. Instructions for the agentic coding agent

You are the senior full-stack engineer responsible for implementing this
product.

### Work method

1.  Inspect the repository before changing anything.
2.  If no app exists, scaffold the project using the recommended stack.
3.  Write a short implementation plan and architecture decision record.
4.  Implement in small, testable milestones.
5.  Build the expense capture flow before dashboard polish.
6.  Add database migrations and authorization policies before connecting
    production data.
7.  Implement and test offline persistence and synchronization as a
    first-class feature.
8.  Run lint, type checks, unit tests, integration tests, and end-to-end
    tests.
9.  Fix errors rather than hiding or suppressing them.
10. Document all setup and deployment steps.

### Non-negotiable instructions

-   Do not build only a static UI mockup.
-   Do not use localStorage as the primary offline database for
    financial transactions; use IndexedDB.
-   Do not use Google Sheets as the primary production database.
-   Do not store financial amounts as floating-point numbers.
-   Do not silently drop offline transactions.
-   Do not mark a transaction synced before server confirmation.
-   Do not rely exclusively on Background Sync.
-   Do not hard-delete financial records.
-   Do not expose private receipts publicly.
-   Do not trust client-side role checks without server-side
    enforcement.
-   Do not insert fake production transactions.
-   Do not claim voice input works offline on every device.
-   Do not claim offline records are backed up until they reach the
    server.
-   Do not over-engineer the initial interface. Make expense entry
    exceptionally easy.

### First deliverables

Before extensive implementation, produce: 1. Repository and stack
assessment. 2. Architecture and data-flow summary. 3. Database schema
and migration plan. 4. Screen/component plan. 5. Offline synchronization
design. 6. Milestone plan.

Then implement Phase 1 and Phase 2, with tests. If provider credentials
are unavailable, use documented local development configuration and
clearly state what the owner must configure.

------------------------------------------------------------------------

## 22. Definition of success

The product succeeds when: - Father can record an expense without
help. - Other authorized people can record expenses from their own
phones. - Expenses entered without internet are retained and later
synchronized. - The owner can see who paid, what it was for, when it was
paid, and whether proof is attached. - Daily and monthly totals are
calculated automatically and reconcile with the ledger. - Historical
records remain auditable. - The system continues to work from
construction through waterpark operations.

**The most important metric is not the number of dashboard charts. It is
the percentage of actual payments recorded accurately and on time.**


---

# 23. Updated father-first experience — Android and voice-first entry

**This section supersedes any conflicting UX assumptions in earlier sections.**

## 23.1 Primary user profile

The primary expense recorder:
- Uses an Android phone.
- Is not comfortable with technical apps or lengthy forms.
- Is most comfortable communicating by speaking, similar to making a phone call.
- Prefers speaking an expense rather than typing it.
- Must be able to record an expense without needing help from the owner.

The product must be designed for this user first. Do not expect him to learn accounting terms, select many fields, or troubleshoot connectivity.

## 23.2 The primary interaction: tap, speak, confirm, save

The default home screen for a contributor should contain one dominant action:

**“बोलकर खर्च दर्ज करें” (Speak to record an expense)**

Suggested flow:

1. Father opens the Soul Dive app from its Android home-screen icon.
2. He taps one large microphone button.
3. The app records or transcribes his spoken expense.
4. The app extracts the amount, purpose, vendor (if mentioned), payment method (if mentioned), and payment date (default: today).
5. The app reads or displays a simple confirmation in Hindi.
6. Father checks the amount and purpose, then taps **“सही है, सेव करें” (Correct, save)**.
7. The expense is saved locally immediately, whether online or offline.
8. If online, it synchronizes to the server. If offline, it remains in the pending queue and syncs later.

Example spoken input:

“आज शर्मा जी को सीमेंट के लिए पाँच हजार रुपये UPI से दिए।”

Expected review card:

- रकम: ₹5,000
- किसलिए: सीमेंट
- किसको: शर्मा जी
- भुगतान: UPI
- तारीख: आज
- दर्ज करने वाले: [signed-in user]

Buttons:
- **सही है, सेव करें**
- **बदलें**
- **दोबारा बोलें**

Never save an ambiguous or low-confidence amount without user confirmation.

## 23.3 Voice interaction requirements

- Use the Android/browser speech recognition capability where available, with a graceful fallback to device keyboard voice typing or a simple manual form.
- Clearly explain microphone permission in Hindi before requesting it.
- Do not request microphone access until the user taps the microphone action.
- Show a clear recording state, elapsed time, and stop/cancel controls.
- Support Hindi speech and common Hinglish phrases, Hindi numerals/number words, and common construction vocabulary.
- Handle mixed-language vendor names and terms such as cement, sand, steel, labour, UPI, cash, pipe, bricks, diesel, and payment.
- Allow the user to correct every extracted field before saving.
- If speech recognition is unavailable, fails, or cannot understand the amount, show a simple retry and manual-entry option.
- Do not claim that speech-to-text works offline on every Android device/browser. Speech recognition may depend on network access, browser, operating system, and installed speech services.
- Offline expense recording must always remain possible through the simple manual form, even if speech recognition is unavailable.
- If an offline-capable on-device speech model is later introduced, treat it as an optional enhancement and test it on the actual target Android devices.
- Do not send audio to third-party services without clearly documenting the provider, data handling, and user consent. Prefer processing/transcription that minimizes retention of raw audio.
- Do not retain raw voice recordings by default. Store the final confirmed transaction fields, not the audio, unless a separately approved feature requires it.

## 23.4 Ultra-simple manual fallback

The fallback form should contain only:
1. Amount
2. Purpose
3. Save

Payment method may be a row of large optional buttons: Cash, UPI, Bank. Vendor, category, phase, receipt, and notes should be under an optional **“और जानकारी” (More details)** section.

Defaults and automatic behavior:
- Payment date defaults to today.
- Submitted-by identity comes from the signed-in account.
- Paid-by defaults to the signed-in user, but can be changed when someone is recording on behalf of another payer.
- Category may be suggested from the description, but the user must be able to change it. If uncertain, use “Uncategorized / समीक्षा आवश्यक” rather than guessing.
- Project phase defaults to the currently active phase configured by the administrator, but remains editable.
- Payment method may be left as “Not specified” rather than blocking a quick save.

The user must be able to save a valid expense without choosing a vendor, category, phase, or uploading a receipt. These can be completed later by an authorized person.

## 23.5 Hindi-first copy and interaction

Use simple Hindi labels:

| English concept | Hindi UI copy |
|---|---|
| Speak to record expense | बोलकर खर्च दर्ज करें |
| Enter amount | रकम दर्ज करें |
| What was it for? | किस चीज़ के लिए पैसे दिए? |
| Who was paid? | किसको पैसे दिए? |
| Payment method | पैसे कैसे दिए? |
| Cash | नकद |
| UPI | UPI |
| Bank transfer | बैंक |
| Attach bill | बिल की फोटो जोड़ें |
| Save expense | खर्च सेव करें |
| Correct, save | सही है, सेव करें |
| Speak again | दोबारा बोलें |
| Edit | बदलें |
| More details | और जानकारी |
| Saved on this phone | फोन में सेव हो गया |
| Waiting for internet | इंटरनेट आने पर भेज दिया जाएगा |
| Synced successfully | रिकॉर्ड सर्वर पर सेव हो गया |
| Sync failed | भेजने में समस्या हुई — रिकॉर्ड फोन में सुरक्षित है |

Do not use technical terms such as database, synchronization, IndexedDB, UUID, or server in the father's interface.

## 23.6 Android-specific experience

- Prioritize current Android Chrome and installed PWA behavior.
- Provide a guided **Add to Home Screen** setup with screenshots or simple Hindi instructions.
- Use a large app icon and clear app name: “Soul Dive खर्चा”.
- Keep the app responsive on common Android screen sizes.
- Support camera capture for receipts using the device camera.
- Compress receipt photos before upload while preserving readable bill details.
- Avoid unnecessary permission prompts.
- Keep the app usable with one hand and large touch targets.
- Prevent the screen from appearing frozen during speech recognition, saving, or syncing.
- On app launch, show any unsynced-entry count in plain Hindi.

## 23.7 Optional voice-call / WhatsApp-style future workflow

The father said he is most comfortable with calling and speaking. The MVP should therefore feel like a voice-note interaction inside the app: tap, speak, confirm, save.

Do **not** make a real telephone call, WhatsApp integration, or automated WhatsApp bot a dependency for the first release. Those approaches introduce provider costs, permissions, connectivity dependencies, and additional failure points.

After the core app is stable, the owner may evaluate a WhatsApp-based voice-note intake channel. If implemented:
- Authenticate or verify the sender's phone number.
- Transcribe the voice note and extract candidate expense fields.
- Send a confirmation summary back to the sender.
- Do not create a final verified expense until the sender confirms it.
- Store the source message reference and audit metadata where legally and technically appropriate.
- Route unclear amounts to a human review queue.
- Ensure the same message cannot create duplicate transactions.

A normal phone call or voice message outside the app cannot be assumed to be automatically captured by the PWA.

## 23.8 Father-first acceptance tests

The product must pass these usability tests with the actual primary user, not only developers:

1. Given the app is installed and the user is signed in, he can find the speak button without assistance.
2. He can record a simple Hindi expense using speech in a short interaction.
3. The app displays the extracted amount prominently and asks for confirmation.
4. He can correct an incorrect amount without restarting the entire process.
5. If speech recognition fails, he can still save using the three-field manual fallback.
6. With internet disabled, he can save a manual expense and see “फोन में सेव हो गया” plus a pending-sync indicator.
7. After internet returns, the expense syncs exactly once.
8. The app never tells him an expense is synced before the server confirms it.
9. He can attach a bill photo without navigating complex file pickers.
10. A first-time user can be onboarded in Hindi in a few minutes.

Run a short usability session with the father and revise the flow based on where he hesitates. The success metric is whether he can use it independently and consistently, not whether the implementation matches the developer's preferred UI.

## 23.9 Updated implementation priority

1. Hindi-first Android home screen with one large speak button.
2. Speech capture/transcription with permission handling and graceful fallback.
3. Review-and-confirm screen with prominent amount.
4. Three-field manual fallback.
5. Offline local save and visible pending status.
6. Reliable synchronization and duplicate prevention.
7. Receipt camera capture.
8. Admin ledger, dashboard, and reports.

Do not delay reliable manual offline capture while experimenting with speech recognition. Voice is the preferred interface, but reliable expense capture is the non-negotiable requirement.
