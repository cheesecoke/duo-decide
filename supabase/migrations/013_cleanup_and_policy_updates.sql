-- Migration 013: Data Cleanup & Improved RLS Policies
-- Created: Oct 21, 2025
-- Purpose: Fix orphaned decisions and improve delete permissions

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to cleanup orphaned decisions for a user's couple
CREATE OR REPLACE FUNCTION cleanup_orphaned_decisions(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  deleted_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_couple_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Use provided user_id or current authenticated user
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 'No user ID provided and not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Get user's couple_id
  SELECT couple_id INTO v_couple_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_couple_id IS NULL THEN
    RETURN QUERY SELECT 0, 'User has no couple'::TEXT;
    RETURN;
  END IF;

  -- Delete orphaned decisions (where partner doesn't exist or is null)
  WITH deleted AS (
    DELETE FROM decisions
    WHERE couple_id = v_couple_id
    AND (
      -- Partner ID is NULL
      partner_id IS NULL
      -- OR Partner ID references non-existent profile
      OR partner_id NOT IN (SELECT id FROM profiles)
      -- OR Creator ID references non-existent profile
      OR creator_id NOT IN (SELECT id FROM profiles)
    )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT
    v_deleted_count,
    format('Cleaned up %s orphaned decision(s) for couple %s', v_deleted_count, v_couple_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_decisions IS
  'Removes decisions with invalid/missing partner or creator references for a user''s couple';

-- ============================================================================
-- IMPROVED RLS POLICIES
-- ============================================================================

-- Drop old restrictive delete policy
DROP POLICY IF EXISTS "Users can delete own decisions" ON decisions;

-- New policy: Anyone in the couple can delete any decision in that couple
CREATE POLICY "Couple members can delete decisions"
  ON decisions FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id
      FROM profiles
      WHERE id = auth.uid()
      AND couple_id IS NOT NULL
    )
  );

COMMENT ON POLICY "Couple members can delete decisions" ON decisions IS
  'Allows any member of a couple to delete decisions belonging to that couple';

-- ============================================================================
-- UTILITY FUNCTION: Get couple info for debugging
-- ============================================================================

CREATE OR REPLACE FUNCTION get_couple_info(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  couple_id UUID,
  partner_id UUID,
  partner_email TEXT,
  partner_name TEXT,
  pending_email TEXT,
  decision_count BIGINT,
  orphaned_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_couple_id UUID;
  v_partner_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  WITH user_info AS (
    SELECT
      p.id,
      p.email,
      p.display_name,
      p.couple_id
    FROM profiles p
    WHERE p.id = v_user_id
  ),
  couple_info AS (
    SELECT
      c.id as couple_id,
      c.pending_partner_email,
      CASE
        WHEN c.user1_id = v_user_id THEN c.user2_id
        WHEN c.user2_id = v_user_id THEN c.user1_id
      END as partner_id
    FROM couples c
    JOIN user_info ui ON c.id = ui.couple_id
  ),
  partner_info AS (
    SELECT
      p.id,
      p.email,
      p.display_name
    FROM profiles p
    JOIN couple_info ci ON p.id = ci.partner_id
  ),
  decision_stats AS (
    SELECT
      COUNT(*) as total_decisions,
      COUNT(*) FILTER (
        WHERE partner_id IS NULL
        OR partner_id NOT IN (SELECT id FROM profiles)
        OR creator_id NOT IN (SELECT id FROM profiles)
      ) as orphaned_decisions
    FROM decisions d
    JOIN user_info ui ON d.couple_id = ui.couple_id
  )
  SELECT
    ui.id,
    ui.email,
    ui.display_name,
    ui.couple_id,
    ci.partner_id,
    pi.email,
    pi.display_name,
    ci.pending_partner_email,
    ds.total_decisions,
    ds.orphaned_decisions
  FROM user_info ui
  LEFT JOIN couple_info ci ON ci.couple_id = ui.couple_id
  LEFT JOIN partner_info pi ON pi.id = ci.partner_id
  CROSS JOIN decision_stats ds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_couple_info IS
  'Debug function to view user''s couple status, partner info, and decision counts';

-- ============================================================================
-- INSTRUCTIONS FOR CLEANUP
-- ============================================================================

-- To cleanup orphaned decisions for the current user:
-- SELECT * FROM cleanup_orphaned_decisions();

-- To view couple info and check for issues:
-- SELECT * FROM get_couple_info();

-- To cleanup for a specific user (admin only):
-- SELECT * FROM cleanup_orphaned_decisions('user-uuid-here');

RAISE NOTICE 'Migration 013 completed: Cleanup functions and improved policies added';
RAISE NOTICE 'Run "SELECT * FROM cleanup_orphaned_decisions();" to clean up orphaned decisions';
RAISE NOTICE 'Run "SELECT * FROM get_couple_info();" to view your couple status';
