-- Migration 017: Fix handle_new_user schema qualification
-- Created: Feb 5, 2026
-- Purpose: Fix "type couples does not exist" error in auth trigger
--
-- The issue: The handle_new_user() trigger runs as supabase_auth_admin
-- which needs fully schema-qualified table names to access public schema tables.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Enhanced function with schema-qualified table references
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_couple public.couples;  -- Schema-qualified type
  v_couple_id UUID;
BEGIN
  -- Step 1: Create profile first (always needed)
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created profile for user: % (email: %)', NEW.id, NEW.email;

  -- Step 2: Check if this email matches any pending partner invitation
  SELECT * INTO v_existing_couple
  FROM public.couples  -- Schema-qualified
  WHERE LOWER(pending_partner_email) = LOWER(NEW.email)
  AND user2_id IS NULL  -- Only link if partner slot is empty
  ORDER BY created_at ASC  -- Use oldest invitation if multiple exist
  LIMIT 1;

  IF FOUND THEN
    -- Auto-link as partner (user2)
    RAISE NOTICE 'Found pending invitation for email: %. Linking to couple: %', NEW.email, v_existing_couple.id;

    -- Update couple record
    UPDATE public.couples  -- Schema-qualified
    SET user2_id = NEW.id,
        pending_partner_email = NULL,  -- Clear the pending email
        updated_at = NOW()
    WHERE id = v_existing_couple.id;

    -- Update new user's profile with couple_id
    UPDATE public.profiles  -- Schema-qualified
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = NEW.id;

    -- Also update user1's profile to ensure they have couple_id set
    UPDATE public.profiles  -- Schema-qualified
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = v_existing_couple.user1_id
    AND couple_id IS NULL;  -- Only update if not already set

    RAISE NOTICE 'Successfully auto-linked user % to couple % as partner', NEW.email, v_existing_couple.id;

    -- Update all decisions for this couple to have the correct partner_id
    -- Decisions created by user1 should have user2 as partner
    UPDATE public.decisions  -- Schema-qualified
    SET partner_id = NEW.id,
        updated_at = NOW()
    WHERE couple_id = v_existing_couple.id
    AND creator_id = v_existing_couple.user1_id
    AND (partner_id IS NULL OR partner_id != NEW.id);

    RAISE NOTICE 'Updated decision partner_ids for couple %', v_existing_couple.id;

  ELSE
    -- No pending invitation found - this is a new primary user
    RAISE NOTICE 'No pending invitation found for email: %. User will need to create couple or be invited.', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
