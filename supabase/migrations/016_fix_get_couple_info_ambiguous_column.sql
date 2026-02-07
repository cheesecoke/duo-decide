-- Migration 016: Fix ambiguous column reference in get_couple_info
-- Created: Feb 5, 2026
-- Purpose: Fix "column reference partner_id is ambiguous" error

-- The issue: In the decision_stats CTE, 'partner_id' could refer to either:
-- 1. The decisions.partner_id column
-- 2. The partner_id output column from couple_info CTE
-- Fix: Qualify with table alias 'd.partner_id' and 'd.creator_id'

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
        WHERE d.partner_id IS NULL
        OR d.partner_id NOT IN (SELECT id FROM profiles)
        OR d.creator_id NOT IN (SELECT id FROM profiles)
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
  'Debug function to view user''s couple status, partner info, and decision counts. Fixed in migration 016.';
