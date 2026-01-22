-- Migration 015: Fix Profiles RLS Recursion (Again)
-- Created: Jan 22, 2026
-- Purpose: Fix infinite recursion in profiles RLS policy introduced by migration 014

-- The issue: Migration 014 reintroduced a recursive policy that queries profiles within profiles policy
-- The fix: Use couples table instead of querying profiles to avoid recursion

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view couple profiles" ON profiles;

-- Create non-recursive policy using couples table
CREATE POLICY "Users can view couple profiles"
ON profiles FOR SELECT
USING (
  -- Can view own profile
  auth.uid() = id
  OR
  -- Can view partner's profile (same couple_id) - use couples table to avoid recursion
  couple_id IN (
    SELECT c.id
    FROM couples c
    WHERE (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    AND c.id IS NOT NULL
  )
);

-- Update the comment
COMMENT ON POLICY "Users can view couple profiles" ON profiles IS
  'Users can view their own profile and their partner''s profile (non-recursive using couples table)';
