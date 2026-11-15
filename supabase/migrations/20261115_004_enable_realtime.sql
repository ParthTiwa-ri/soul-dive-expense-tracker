-- ====================================================================
-- Soul Dive Water Park — Enable Realtime WebSocket Broadcasts
-- Allows zero-refresh, instant live synchronization across devices
-- ====================================================================

-- 1. Add expenses table to the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  END IF;
END $$;

-- 2. Set REPLICA IDENTITY FULL so UPDATE and DELETE events send complete old/new payloads
ALTER TABLE expenses REPLICA IDENTITY FULL;

