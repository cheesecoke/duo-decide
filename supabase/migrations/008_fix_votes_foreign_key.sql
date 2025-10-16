-- Fix votes table foreign key to reference profiles instead of auth.users
-- This fixes the "Key is not present in table users" error

-- Drop the existing foreign key constraint
ALTER TABLE votes
DROP CONSTRAINT IF EXISTS votes_user_id_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE votes
ADD CONSTRAINT votes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'votes_user_id_fkey';

