# Soul Dive खर्चा — Water Park Expense Manager

> **Production-minded, offline-first, mobile-first, and father-first expense management PWA for the Soul Dive Water Park project.**

---

## 🌊 Overview & Core Principles

Soul Dive Expense Manager is designed specifically to solve the on-site financial capture problem during water park construction, pre-opening, and daily operations. 

- **Father-First Voice Capture:** Tap one large microphone button, speak in everyday Hindi (e.g., *"आज शर्मा जी को सीमेंट के लिए पाँच हजार रुपये UPI से दिए"*), review the extracted card, and save in seconds.
- **Ultra-Simple Manual Fallback:** 3-step quick entry (1. Amount → 2. Purpose → 3. Payment Method) with optional "और जानकारी" for bills and vendors.
- **True Offline-First Architecture:** Uses IndexedDB (Dexie.js) to store transactions locally with zero network dependency. Records display immediate confirmation (*"फोन में सेव हो गया"*) and sync idempotently via `client_uuid` once connectivity returns.
- **Strict Financial Integrity:** All amounts are stored as **integer paise** (₹1 = 100 paise) to prevent floating-point inaccuracies. No silent deletions or data fabrications.
- **PWA Installation:** Installable directly to Android Home Screen as **"Soul Dive खर्चा"** with full service-worker app-shell caching.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v10+

### 2. Installation
```bash
git clone <repo-url>
cd soul-dive-expense-tracker
npm install
```

### 3. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile browser or desktop.

### 4. Running the Automated Test Suite
```bash
npm test
```
Runs the Vitest suite verifying Hindi voice NLP parsing, Indian currency formatting, and idempotent server synchronization.

---

## 📱 PWA & Android Installation ("Soul Dive खर्चा")

1. Open the deployed application URL in **Google Chrome on Android**.
2. Tap the Chrome three-dot menu (**⋮**) in the top-right corner.
3. Tap **"Add to Home screen" (होम स्क्रीन पर जोड़ें)**.
4. An icon named **"Soul Dive खर्चा"** will appear on your phone's home screen.
5. The app can now be opened offline anytime!

---

## 🗣️ Contributor Onboarding Guide (पिताजी और कर्मचारियों के लिए निर्देश)

### खर्च दर्ज करने का तरीका (३० सेकंड से कम में):

1. **बोलकर खर्च दर्ज करें (Voice Entry):**
   - फोन की होम स्क्रीन से **Soul Dive खर्चा** ऐप खोलें।
   - बीच में दिया गया बड़ा **माइक बटन** दबाएं।
   - साफ आवाज में बोलें, जैसे: *"आज शर्मा जी को सीमेंट के लिए 5000 रुपये UPI से दिए।"*
   - स्क्रीन पर रकम (₹5,000) और काम जांचें।
   - हरा बटन **"सही है, सेव करें"** दबाएं।

2. **यदि आवाज से दर्ज न हो (Manual Fallback):**
   - नीचे दिए गए **"टाइप करके दर्ज करें"** बटन पर टैप करें।
   - रकम भरें (उदा: 5000)।
   - किसलिए दिए वो लिखें (उदा: सीमेंट)।
   - नकद या UPI चुनें और **"खर्च सेव करें"** दबाएं।

3. **इंटरनेट न होने पर:**
   - चिंता न करें! आपका खर्च फोन में सुरक्षित सेव हो जाएगा।
   - इंटरनेट आते ही यह अपने आप सर्वर पर सुरक्षित सिंक हो जाएगा।

---

## 🗄️ Database Migrations (Supabase / PostgreSQL)

Database migration files are located in `supabase/migrations/`:
- `supabase/migrations/20261115_001_initial_schema.sql`: Full DDL for profiles, categories, project phases, vendors, expenses, receipts, audit logs, and cash sessions with Row-Level Security (RLS) policies.
- `supabase/migrations/20261115_002_seed_data.sql`: Master seed data with bilingual (Hindi + English) categories, construction phases, and default user roles.

### Applying Migrations to Supabase:
1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy and run `supabase/migrations/20261115_001_initial_schema.sql`.
4. Copy and run `supabase/migrations/20261115_002_seed_data.sql`.
5. Copy your project URL and keys to `.env.local` (see `.env.example`).

---

## 📊 Features & Modules

| Module | Features |
|---|---|
| **Father-First Voice Entry** | Web Speech API + Hindi NLP extractor for numbers, Lakh/Hazaar, vendors, and UPI/Cash modes. |
| **3-Field Quick Manual Entry** | Fast keypad entry with instant local IndexedDB write (< 20 seconds). |
| **Receipt Camera Compression** | HTML5 Canvas client-side compression to preserve cellular bandwidth while keeping bills readable. |
| **Central Ledger** | Filter by category, payment mode, date range (Asia/Kolkata), search by vendor, and CSV export. |
| **Executive Dashboard** | Total cash outflow, recognized expense, this month's burn, category bar charts, and payment method distribution. |
| **Daily Cash Reconciliation** | Site cash drawer balancing: Opening Balance + Inflows - Cash Expenses = Expected vs Actual Closing. |
| **Role-Based Access Control** | Owner, Manager, Contributor, and Viewer roles with managerial verification queue. |

---

## 🔒 Security & Data Safety

- No sensitive API secrets exposed in frontend bundles.
- UUIDv4 idempotency keys prevent duplicate transaction creation on network reconnect.
- Receipts stored in private buckets with verified user access.
- Tamper-evident revision audit log for post-verification amendments.

