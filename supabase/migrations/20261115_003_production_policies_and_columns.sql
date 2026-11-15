-- ====================================================================
-- Soul Dive Water Park — Production Columns & RLS Policy Upgrade
-- Run this in Supabase SQL Editor if you already applied migration 001
-- ====================================================================

-- 1. Safely add missing columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_name_hi TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS phase_name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- 2. Drop legacy restrictive policies that require Supabase Auth user sessions
DROP POLICY IF EXISTS "Read expenses" ON expenses;
DROP POLICY IF EXISTS "Insert expenses" ON expenses;
DROP POLICY IF EXISTS "Update unverified own expenses" ON expenses;
DROP POLICY IF EXISTS "Allow select expenses" ON expenses;
DROP POLICY IF EXISTS "Allow insert expenses" ON expenses;
DROP POLICY IF EXISTS "Allow update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow delete expenses" ON expenses;

-- 3. Create production RLS policies for offline-sync application
CREATE POLICY "Allow select expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update expenses" ON expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete expenses" ON expenses FOR DELETE USING (true);

-- 4. Ensure Vendors, Categories and Profiles have full CRUD permissions
DROP POLICY IF EXISTS "Insert vendors" ON vendors;
DROP POLICY IF EXISTS "Manage vendors" ON vendors;
CREATE POLICY "Allow write vendors" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vendors" ON vendors FOR UPDATE USING (true);
CREATE POLICY "Allow delete vendors" ON vendors FOR DELETE USING (true);

DROP POLICY IF EXISTS "Manage categories" ON categories;
CREATE POLICY "Allow manage categories" ON categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Manage phases" ON project_phases;
CREATE POLICY "Allow manage phases" ON project_phases FOR ALL USING (true);

DROP POLICY IF EXISTS "Owner/Manager update profiles" ON profiles;
CREATE POLICY "Allow manage profiles" ON profiles FOR ALL USING (true);

