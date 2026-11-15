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

### Step 2: Apply Database Schema & Master Data (1 Minute)
You don't need to write any SQL manually — the schema files are already in this repo:

1. In your Supabase project dashboard, click on the **SQL Editor** tab in the left sidebar (icon looks like `>_`).
2. Click **"New Query"**.
3. Open [supabase/migrations/20261115_001_initial_schema.sql](supabase/migrations/20261115_001_initial_schema.sql), copy all lines, paste into the Supabase SQL editor, and click **"Run"** (green button).
   - *This creates the `expenses`, `categories`, `vendors`, `project_phases`, and audit tables.*
4. Open [supabase/migrations/20261115_002_seed_data.sql](supabase/migrations/20261115_002_seed_data.sql), copy all lines, paste into a new query, and click **"Run"**.
   - *This preloads all water park categories (Cement, Labour, Transport, Food, Slides, etc.) and demo profiles.*

---

### Step 3: Copy Your API Keys
1. In your Supabase dashboard, click the **Settings (gear icon)** at the bottom left.
2. Click **API** under Configuration.
3. Copy these two values:
   - **Project URL** (e.g. `https://xyzabcdefghijklm.supabase.co`)
   - **anon / public key** (long token starting with `eyJ...`)

---

### Step 4: Configure Your Environment Variables

#### For Local Development on Your Laptop:
Create a file named `.env.local` in the project root:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
*(Replace with your actual Project URL and anon key).*

#### For Production Hosting on Vercel:
1. In your [Vercel Dashboard](https://vercel.com), select your `soul-dive-expense-tracker` project.
2. Go to **Settings** → **Environment Variables**.
3. Add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key-here` |
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

