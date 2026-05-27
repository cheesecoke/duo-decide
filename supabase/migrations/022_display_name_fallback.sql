-- Migration 022: display_name fallback chain for handle_new_user()
-- Created: May 27, 2026
-- Purpose: Ensure profiles.display_name is never NULL after signup, regardless
-- of auth provider. Previously the trigger only read raw_user_meta_data->>'display_name',
-- which Google OAuth doesn't populate (it uses 'name' / 'full_name'), and which the
-- app's email/password signup doesn't pass either. The result was every auto-linked
-- partner (any provider) starting with NULL display_name until manually fixed.
--
-- This migration:
--   1. Replaces handle_new_user() with a COALESCE chain over likely metadata keys,
--      falling back to the email username as a guaranteed-non-null final option.
--   2. Backfills existing NULL display_names using the same logic.
--
-- All other behavior of the trigger (partner auto-linking, couple_id propagation,
-- decisions.partner_id update) is preserved exactly from migration 017.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_couple public.couples;
  v_couple_id UUID;
BEGIN
  -- Step 1: Create profile with a never-NULL display_name.
  -- COALESCE order: explicit display_name claim (future-proof) → Google's full_name →
  -- Google's name → email username as a guaranteed fallback. NULLIF coerces empty
  -- strings (which some providers return instead of omitting the field) to NULL so
  -- COALESCE skips them.
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created profile for user: % (email: %)', NEW.id, NEW.email;

  -- Step 2: Check if this email matches any pending partner invitation
  SELECT * INTO v_existing_couple
  FROM public.couples
  WHERE LOWER(pending_partner_email) = LOWER(NEW.email)
  AND user2_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RAISE NOTICE 'Found pending invitation for email: %. Linking to couple: %', NEW.email, v_existing_couple.id;

    UPDATE public.couples
    SET user2_id = NEW.id,
        pending_partner_email = NULL,
        updated_at = NOW()
    WHERE id = v_existing_couple.id;

    UPDATE public.profiles
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = NEW.id;

    UPDATE public.profiles
    SET couple_id = v_existing_couple.id,
        updated_at = NOW()
    WHERE id = v_existing_couple.user1_id
    AND couple_id IS NULL;

    RAISE NOTICE 'Successfully auto-linked user % to couple % as partner', NEW.email, v_existing_couple.id;

    UPDATE public.decisions
    SET partner_id = NEW.id,
        updated_at = NOW()
    WHERE couple_id = v_existing_couple.id
    AND creator_id = v_existing_couple.user1_id
    AND (partner_id IS NULL OR partner_id != NEW.id);

    RAISE NOTICE 'Updated decision partner_ids for couple %', v_existing_couple.id;
  ELSE
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

-- Backfill existing NULL display_names using the same fallback chain.
-- Idempotent: WHERE display_name IS NULL ensures we never overwrite a value
-- the user (or /setup-partner) has already set.
UPDATE public.profiles p
SET display_name = COALESCE(
      NULLIF(u.raw_user_meta_data->>'display_name', ''),
      NULLIF(u.raw_user_meta_data->>'full_name', ''),
      NULLIF(u.raw_user_meta_data->>'name', ''),
      split_part(u.email, '@', 1)
    ),
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.display_name IS NULL;
