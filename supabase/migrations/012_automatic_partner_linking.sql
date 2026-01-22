-- Migration 012: Automatic Partner Linking on Signup
-- Created: Oct 21, 2025
-- Purpose: Auto-link users when they sign up with an invited email

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Enhanced function to handle automatic partner linking
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_couple couples;
  v_couple_id UUID;
BEGIN
  -- Step 1: Create profile first (always needed)
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created profile for user: % (email: %)', NEW.id, NEW.email;

  -- Step 2: Check if this email matches any pending partner invitation
  SELECT * INTO v_existing_couple
  FROM couples
  WHERE LOWER(pending_partner_email) = LOWER(NEW.email)
  AND user2_id IS NULL  -- Only link if partner slot is empty
  ORDER BY created_at ASC  -- Use oldest invitation if multiple exist
  LIMIT 1;

  IF FOUND THEN
    -- Auto-link as partner (user2)
    RAISE NOTICE 'Found pending invitation for email: %. Linking to couple: %', NEW.email, v_existing_couple.id;

    -- Update couple record
    UPDATE couples
    SET user2_id = NEW.id,
        pending_partner_email = NULL,  -- Clear the pending email
        updated_at = NOW()
    WHERE id = v_existing_couple.id;

    -- Update new user's profile with couple_id
    UPDATE profiles
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = NEW.id;

    -- Also update user1's profile to ensure they have couple_id set
    UPDATE profiles
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = v_existing_couple.user1_id
    AND couple_id IS NULL;  -- Only update if not already set

    RAISE NOTICE 'Successfully auto-linked user % to couple % as partner', NEW.email, v_existing_couple.id;

    -- Update all decisions for this couple to have the correct partner_id
    -- Decisions created by user1 should have user2 as partner
    UPDATE decisions
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

-- Recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Migration complete (RAISE NOTICE removed - causes error outside functions)
