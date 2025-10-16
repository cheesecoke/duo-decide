-- Ensure profiles exist for both users in the test couple
-- This fixes foreign key constraint errors when creating votes

DO $$
DECLARE
  v_chase_user_id UUID := 'a3cc73ea-9c99-42a2-acf5-3aec595fca96';
  v_partner_user_id UUID := 'cf1b1ca0-cc0a-4c53-9e38-418e628f9471';
  v_couple_id UUID := '11111111-1111-1111-1111-111111111111';
  v_chase_email TEXT;
  v_partner_email TEXT;
BEGIN
  -- Get emails from auth.users
  SELECT email INTO v_chase_email FROM auth.users WHERE id = v_chase_user_id;
  SELECT email INTO v_partner_email FROM auth.users WHERE id = v_partner_user_id;

  -- Insert or update Chase's profile
  INSERT INTO profiles (id, email, couple_id, created_at, updated_at)
  VALUES (v_chase_user_id, v_chase_email, v_couple_id, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET couple_id = v_couple_id,
      email = v_chase_email,
      updated_at = NOW();

  -- Insert or update Partner's profile  
  INSERT INTO profiles (id, email, couple_id, created_at, updated_at)
  VALUES (v_partner_user_id, v_partner_email, v_couple_id, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET couple_id = v_couple_id,
      email = v_partner_email,
      updated_at = NOW();

  RAISE NOTICE 'Profiles ensured for both users';
  RAISE NOTICE '  User 1: % (%)', v_chase_email, v_chase_user_id;
  RAISE NOTICE '  User 2: % (%)', v_partner_email, v_partner_user_id;
END $$;

-- Verify the profiles exist
SELECT 
  p.id,
  p.email,
  p.couple_id,
  c.user1_id,
  c.user2_id
FROM profiles p
LEFT JOIN couples c ON p.couple_id = c.id
WHERE p.id IN (
  'a3cc73ea-9c99-42a2-acf5-3aec595fca96',
  'cf1b1ca0-cc0a-4c53-9e38-418e628f9471'
)
ORDER BY p.email;

