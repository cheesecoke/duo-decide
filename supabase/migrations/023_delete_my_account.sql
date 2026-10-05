-- Migration 023: in-app account deletion (App Store guideline 5.1.1(v))
--
-- `delete_my_account()` deletes the caller's account. The rule (Oct 2026,
-- the minimum for launch; richer offboarding is tracked separately):
--
--   * No partner linked → the couple and everything in it is deleted.
--   * Partner linked →
--       - open decisions (status <> 'completed') are deleted: they can't be
--         finished without both people;
--       - completed decisions stay in the partner's history, with the
--         leaver's creator_id / partner_id / decided_by set to NULL, which
--         the app shows as "Former partner";
--       - the leaver's votes are deleted;
--       - shared option lists stay; the leaver's creator_id is cleared;
--       - the remaining partner moves to user1_id and user2_id is cleared,
--         the same state as a solo user, so they can invite someone new.
--   * Finally the profile and the auth user are deleted.
--
-- lib/legal.ts (the privacy policy's "Deleting your account" section)
-- describes this rule. Change both together.

-- ---------------------------------------------------------------------------
-- NULL now means "former partner" on completed decisions.
-- ---------------------------------------------------------------------------
ALTER TABLE public.decisions ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE public.decisions ALTER COLUMN partner_id DROP NOT NULL;

-- cleanup_orphaned_decisions (013) deleted every decision with a NULL
-- partner_id, which would now wipe a former couple's completed history.
-- Completed decisions are never orphans any more; open ones still are.
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_decisions(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(deleted_count INTEGER, message TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_couple_id UUID;
  v_deleted_count INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 'No user ID provided and not authenticated'::TEXT;
    RETURN;
  END IF;

  SELECT couple_id INTO v_couple_id FROM public.profiles WHERE id = v_user_id;

  IF v_couple_id IS NULL THEN
    RETURN QUERY SELECT 0, 'User has no couple'::TEXT;
    RETURN;
  END IF;

  WITH deleted AS (
    DELETE FROM public.decisions
    WHERE couple_id = v_couple_id
    AND status IS DISTINCT FROM 'completed'
    AND (
      partner_id IS NULL
      OR partner_id NOT IN (SELECT id FROM public.profiles)
      OR creator_id IS NULL
      OR creator_id NOT IN (SELECT id FROM public.profiles)
    )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT
    v_deleted_count,
    format('Cleaned up %s orphaned decision(s) for couple %s', v_deleted_count, v_couple_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ---------------------------------------------------------------------------
-- delete_my_account()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_couple public.couples%ROWTYPE;
  v_partner UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_couple
  FROM public.couples
  WHERE user1_id = v_uid OR user2_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    v_partner := CASE WHEN v_couple.user1_id = v_uid THEN v_couple.user2_id ELSE v_couple.user1_id END;

    IF v_partner IS NULL THEN
      -- Solo: nobody left to keep anything for. Votes and options cascade
      -- from decisions; list items cascade from option_lists.
      DELETE FROM public.decisions WHERE couple_id = v_couple.id;
      DELETE FROM public.option_lists WHERE couple_id = v_couple.id;
      UPDATE public.profiles SET couple_id = NULL WHERE couple_id = v_couple.id;
      DELETE FROM public.couples WHERE id = v_couple.id;
    ELSE
      DELETE FROM public.decisions
      WHERE couple_id = v_couple.id AND status IS DISTINCT FROM 'completed';

      DELETE FROM public.votes WHERE user_id = v_uid;

      UPDATE public.decisions SET creator_id = NULL
      WHERE couple_id = v_couple.id AND creator_id = v_uid;
      UPDATE public.decisions SET partner_id = NULL
      WHERE couple_id = v_couple.id AND partner_id = v_uid;
      UPDATE public.decisions SET decided_by = NULL
      WHERE couple_id = v_couple.id AND decided_by = v_uid;

      UPDATE public.option_lists SET creator_id = NULL
      WHERE couple_id = v_couple.id AND creator_id = v_uid;

      UPDATE public.couples
      SET user1_id = v_partner, user2_id = NULL, pending_partner_email = NULL
      WHERE id = v_couple.id;
    END IF;
  END IF;

  -- Anything left pointing at the leaver outside their couple (stale rows
  -- from early test data) must not block the delete.
  DELETE FROM public.votes WHERE user_id = v_uid;

  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Deletes the caller''s account. Solo: couple and all its data. Linked: open decisions deleted, completed history kept for the partner with the leaver''s ids nulled, partner re-seated as user1.';
