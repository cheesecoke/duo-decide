-- Migration 024: archive decided decisions + soft delete
--
-- Chase (Nov 2026): decided decisions pile up on the home screen. They
-- should leave the queue without leaving History, and nothing should ever be
-- hard-deleted from the app — only soft-deleted.
--
--   * archived_at / archived_by — a decided decision the couple has put away.
--     It leaves the queue and stays in History. Shared: one partner archives
--     it for both, because the queue is shared. (Per-person would need a
--     join table instead of these two columns.)
--   * deleted_at / deleted_by — a soft delete. The row, its options and its
--     votes stay in the database; the app never shows it again, anywhere,
--     and it no longer counts in History's stats.
--
-- The app reads:
--   queue   = archived_at IS NULL AND deleted_at IS NULL
--   history = status = 'completed' AND deleted_at IS NULL (archived or not)
--
-- All three writes go through SECURITY DEFINER RPCs that check the caller is
-- in the decision's couple and stamp who did it from auth.uid().
--
-- Why SELECT RLS does NOT hide soft-deleted rows: Supabase Realtime only
-- delivers a postgres_changes UPDATE to a subscriber who can SELECT the new
-- row (see migration 021's note). If the SELECT policy hid deleted rows, the
-- partner would never hear about a delete and the card would sit in their
-- queue until they reloaded. The rows are the couple's own data, so the
-- filter lives in lib/database.ts (every decisions read) and in the queue's
-- realtime handler instead.
--
-- What IS enforced here:
--   * clients can no longer hard-delete a decision (the DELETE policy goes);
--   * a soft-deleted decision is read-only to clients, and a client cannot
--     soft-delete by writing deleted_at directly (restrictive UPDATE policy).
--
-- Not changed, on purpose:
--   * delete_my_account() (023) still hard-deletes, as the privacy policy
--     (lib/legal.ts) promises. It is SECURITY DEFINER, so the dropped DELETE
--     policy does not affect it. archived_by / deleted_by are ON DELETE SET
--     NULL, so the leaver's id goes with their profile.
--   * cleanup_orphaned_decisions() (013/023) still hard-deletes open orphans
--     left behind by a deleted account — that is the same privacy promise.
--
-- Additive and idempotent: safe to run twice.

ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.decisions.archived_at IS
  'Set when the couple archives a decided decision: hidden from the queue, kept in History.';
COMMENT ON COLUMN public.decisions.deleted_at IS
  'Soft delete. Hidden from the queue, History and stats. Options and votes are kept.';

-- The queue's read and History's read.
CREATE INDEX IF NOT EXISTS idx_decisions_queue
  ON public.decisions (couple_id, created_at DESC)
  WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_history
  ON public.decisions (couple_id, decided_at DESC)
  WHERE status = 'completed' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- No hard deletes from the app. delete_my_account() and
-- cleanup_orphaned_decisions() are SECURITY DEFINER and unaffected.
DROP POLICY IF EXISTS "Couple members can delete decisions" ON public.decisions;
DROP POLICY IF EXISTS "Users can delete own decisions" ON public.decisions;

-- Restrictive: AND-ed with "Users can update own decisions" (004).
--   USING      — a soft-deleted row cannot be updated by a client;
--   WITH CHECK — a client cannot set deleted_at itself (use the RPC).
DROP POLICY IF EXISTS "Soft-deleted decisions are read-only" ON public.decisions;
CREATE POLICY "Soft-deleted decisions are read-only"
  ON public.decisions
  AS RESTRICTIVE
  FOR UPDATE
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- The caller's decision row, locked, or an error. Outsiders get the same
-- "not found" as a missing id, so the RPCs do not reveal what exists.
CREATE OR REPLACE FUNCTION public.decision_for_member(p_decision_id UUID)
RETURNS public.decisions AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.decisions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT d.* INTO v_row
  FROM public.decisions d
  JOIN public.couples c ON c.id = d.couple_id
  WHERE d.id = p_decision_id
    AND (c.user1_id = v_uid OR c.user2_id = v_uid)
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decision not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Archive a decided decision for both partners. Archiving twice keeps the
-- first stamp.
CREATE OR REPLACE FUNCTION public.archive_decision(p_decision_id UUID)
RETURNS void AS $$
DECLARE
  v_row public.decisions%ROWTYPE;
BEGIN
  v_row := public.decision_for_member(p_decision_id);

  IF v_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Decision not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Only a decided decision can be archived' USING ERRCODE = '22023';
  END IF;

  UPDATE public.decisions
  SET archived_at = COALESCE(archived_at, NOW()),
      archived_by = COALESCE(archived_by, auth.uid()),
      updated_at = NOW()
  WHERE id = p_decision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- History's "Move back to queue".
CREATE OR REPLACE FUNCTION public.unarchive_decision(p_decision_id UUID)
RETURNS void AS $$
DECLARE
  v_row public.decisions%ROWTYPE;
BEGIN
  v_row := public.decision_for_member(p_decision_id);

  IF v_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Decision not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.decisions
  SET archived_at = NULL,
      archived_by = NULL,
      updated_at = NOW()
  WHERE id = p_decision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Soft delete, any status. Deleting twice keeps the first stamp. Options and
-- votes are left exactly as they are.
CREATE OR REPLACE FUNCTION public.soft_delete_decision(p_decision_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM public.decision_for_member(p_decision_id);

  UPDATE public.decisions
  SET deleted_at = NOW(),
      deleted_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_decision_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.decision_for_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decision_for_member(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.decision_for_member(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.archive_decision(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_decision(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_decision(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.unarchive_decision(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unarchive_decision(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.unarchive_decision(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_decision(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_decision(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_decision(UUID) TO authenticated;

COMMENT ON FUNCTION public.archive_decision(UUID) IS
  'Archives a completed decision for the couple: off the queue, still in History.';
COMMENT ON FUNCTION public.unarchive_decision(UUID) IS
  'Moves an archived decision back to the couple''s queue.';
COMMENT ON FUNCTION public.soft_delete_decision(UUID) IS
  'Soft-deletes a decision (sets deleted_at). Options and votes are kept.';
