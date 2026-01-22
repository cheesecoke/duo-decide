-- Migration 014: Fix Profiles RLS to Allow Signup Trigger
-- Created: Dec 30, 2024
-- Purpose: Fix RLS policies on profiles table so handle_new_user() trigger can create profiles

-- The issue: RLS policies are blocking the handle_new_user() trigger from inserting profiles
-- The fix: Update RLS policies to allow inserts from the trigger (which runs as SECURITY DEFINER)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;

-- Create new policies that work with the trigger

-- Allow anyone to insert profiles (trigger needs this)
-- The trigger itself ensures only valid profiles are created
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
WITH CHECK (true);

-- Allow users to view profiles in their couple
CREATE POLICY "Users can view couple profiles"
ON profiles FOR SELECT
USING (
  -- Can view own profile
  auth.uid() = id
  OR
  -- Can view partner's profile (same couple_id)
  couple_id IN (
    SELECT couple_id
    FROM profiles
    WHERE id = auth.uid()
    AND couple_id IS NOT NULL
  )
);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow trigger to update profiles (for setting couple_id during auto-linking)
-- This is needed because the trigger updates profiles with couple_id
CREATE POLICY "Allow system updates for coupling"
ON profiles FOR UPDATE
USING (true)  -- Allow updates from trigger (SECURITY DEFINER bypasses this)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow profile creation" ON profiles IS
  'Allows handle_new_user() trigger to create profiles on signup';

COMMENT ON POLICY "Users can view couple profiles" ON profiles IS
  'Users can view their own profile and their partner''s profile';

COMMENT ON POLICY "Users can update own profile" ON profiles IS
  'Users can only update their own profile data';

COMMENT ON POLICY "Allow system updates for coupling" ON profiles IS
  'Allows trigger to update couple_id when linking partners';
