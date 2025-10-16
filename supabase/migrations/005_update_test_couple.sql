-- Update test couple to use chasetest70@gmail.com instead of chase.test.test@gmail.com
-- Run this in Supabase SQL Editor

-- First, let's check if chasetest70@gmail.com exists
-- If it doesn't exist, you'll need to create the account first via the app's sign-up

DO $$
DECLARE
  v_old_partner_id UUID := 'b02baa2d-f630-46dc-8024-492ccd18ebba';
  v_new_partner_id UUID;
  v_chase_user_id UUID := 'a3cc73ea-9c99-42a2-acf5-3aec595fca96';
  v_couple_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Get the new partner's user ID from auth.users
  SELECT id INTO v_new_partner_id
  FROM auth.users
  WHERE email = 'chasetest70@gmail.com';

  -- Check if user exists
  IF v_new_partner_id IS NULL THEN
    RAISE EXCEPTION 'User chasetest70@gmail.com not found. Please sign up with this email first.';
  END IF;

  RAISE NOTICE 'Found chasetest70@gmail.com with ID: %', v_new_partner_id;

  -- Update the couple table
  UPDATE couples
  SET user2_id = v_new_partner_id,
      updated_at = NOW()
  WHERE id = v_couple_id;

  RAISE NOTICE 'Updated couple table';

  -- Update the new partner's profile to link to the couple
  UPDATE profiles
  SET couple_id = v_couple_id,
      updated_at = NOW()
  WHERE id = v_new_partner_id;

  RAISE NOTICE 'Updated new partner profile';

  -- Remove couple_id from old partner's profile (if exists)
  UPDATE profiles
  SET couple_id = NULL,
      updated_at = NOW()
  WHERE id = v_old_partner_id;

  RAISE NOTICE 'Unlinked old partner profile';

  -- Update all decisions to use the new partner_id
  UPDATE decisions
  SET partner_id = v_new_partner_id,
      updated_at = NOW()
  WHERE couple_id = v_couple_id
    AND partner_id = v_old_partner_id;

  RAISE NOTICE 'Updated decisions with new partner_id';

  -- Delete any votes from the old partner (if needed)
  DELETE FROM votes
  WHERE user_id = v_old_partner_id;

  RAISE NOTICE 'Removed old partner votes';

  RAISE NOTICE 'Migration complete! New couple setup:';
  RAISE NOTICE '  User 1: chasewcole@gmail.com (%)' , v_chase_user_id;
  RAISE NOTICE '  User 2: chasetest70@gmail.com (%)' , v_new_partner_id;
  RAISE NOTICE '  Couple ID: %', v_couple_id;

END $$;

-- Verify the update
SELECT
  p.email,
  p.id as user_id,
  p.couple_id,
  c.user1_id,
  c.user2_id
FROM profiles p
LEFT JOIN couples c ON p.couple_id = c.id
WHERE p.email IN ('chasewcole@gmail.com', 'chasetest70@gmail.com')
ORDER BY p.email;
