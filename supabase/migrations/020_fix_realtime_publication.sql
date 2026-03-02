-- Fix realtime publication: correct table names and add missing tables

-- Add correct table: list_options (actual table name; migration 019 referenced non-existent option_list_items)
ALTER PUBLICATION supabase_realtime ADD TABLE list_options;

-- Add missing table: decision_options (for option elimination tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE decision_options;

-- Ensure REPLICA IDENTITY FULL on all realtime tables
ALTER TABLE decisions REPLICA IDENTITY FULL;
ALTER TABLE votes REPLICA IDENTITY FULL;
ALTER TABLE option_lists REPLICA IDENTITY FULL;
ALTER TABLE list_options REPLICA IDENTITY FULL;
ALTER TABLE decision_options REPLICA IDENTITY FULL;
