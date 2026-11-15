# Soul Dive Expense Tracker — Supabase Setup & Connection Guide

This guide provides simple, step-by-step instructions to connect **Supabase** (Free Tier PostgreSQL Database) to your Soul Dive Expense Manager for multi-device cloud synchronization.

---

## 🏗 How It Works (Offline-First Architecture)

1. **On-Site Offline Storage (Phone):**
   - Whenever an expense is recorded (via Voice or Manual form), it is saved **immediately** to the phone's local storage (**IndexedDB via Dexie.js**).
   - Works 100% without internet.
2. **Background Cloud Sync (Supabase):**
   - When the device has internet connection, the sync engine calls `/api/sync/expenses`.
   - The transaction is written to your Supabase PostgreSQL database.
3. **Multi-Device Availability:**
   - Expenses recorded on your father's phone or site manager's mobile instantly become visible on your laptop ledger and approval screen.
4. **Idempotency Guarantee:**
   - Every transaction generates a unique `clientUuid`. Even if a phone reconnects multiple times, duplicate entries are automatically prevented.

---

## 💰 Supabase Free Tier Highlights

- **Cost:** ₹0 / Free forever (No credit card needed).
- **Database:** 500 MB PostgreSQL (holds hundreds of thousands of expenses).
- **Receipt Storage:** 1 GB file storage for paper bill photos.
- **Active Users:** 50,000 monthly active users.
- **API Requests:** Unlimited REST/GraphQL requests.

---

## 🚀 Step-by-Step Connection Instructions

### Step 1: Create Free Supabase Project (2 Minutes)
1. Open [supabase.com](https://supabase.com) and click **"Start your project"**.
2. Sign in with your GitHub account.
3. Click **"New Project"**.
4. Fill in:
   - **Organization:** Select your default org.
   - **Name:** `soul-dive-expenses`
   - **Database Password:** Enter a strong password (save this in your notes).
   - **Region:** Select **South Asia (Mumbai)** for the fastest speed in India.
5. Click **"Create new project"** (takes ~1 minute to initialize).

---

### Step 2: Apply Database Schema & Migrations Automatically

You do **not** need to manually copy or paste SQL into the browser! We have an automated migration runner.

Simply run this command in your project terminal:
```bash
npm run db:migrate
```

This will automatically connect to your Supabase PostgreSQL database, create any missing tables, apply new columns, and set up all security policies. It will output:
```text
🚀 Starting Soul Dive Supabase Automated Migration...
✓ Connected to Supabase PostgreSQL database successfully.
  ✓ Applied:  20261115_001_initial_schema.sql
  ✓ Applied:  20261115_002_seed_data.sql
  ✓ Applied:  20261115_003_production_policies_and_columns.sql
🎉 Success: Database schema is 100% up to date!
```

---

### Step 3: Production Hosting on Vercel

1. In your [Vercel Dashboard](https://vercel.com), click **"Add New..."** → **"Project"** and import `soul-dive-expense-tracker`.
2. Go to **Settings** → **Environment Variables** and add:

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ksdekyjycfhrjsbtqrhb.supabase.co` | Live Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_Rv5PEEqEdR-f-no4Rx6FAg_x12BGz5a` | Supabase Public Publishable Key |

3. Click **"Save"** and **"Deploy"**. Vercel will build and deploy your app in ~60 seconds.
4. Click **Save** and trigger a **Redeploy**.

---

## 🔍 How to Verify It's Working

1. Open your app at `http://localhost:3000` or your Vercel URL.
2. Record an expense (e.g. via Voice Recorder: *"सामान लाने के लिए मजदूर को ₹400 दिए"*).
3. Look at the expense card: it will show:
   - First: `फोन में सेव (Local)`
   - Within 1–2 seconds: `सर्वर पर सुरक्षित ✓ (Synced)`
4. In your **Supabase Dashboard**, click **Table Editor** → **`expenses`**.
5. You will see the new row with `amount_paise = 40000`, `description = 'सामान लाने के लिए'`, and `payment_method = 'cash'`!

---

## 🛡 Security & Backup Notes

- **Row Level Security (RLS):** Enabled in the schema so data can only be accessed with valid API keys.
- **Zero Data Loss:** Even if Supabase is temporarily unreachable, no expenses are lost. They stay safely stored on the user's phone in IndexedDB and retry syncing automatically when the connection returns.

