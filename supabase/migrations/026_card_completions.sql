-- Migration 026: "I did this today" on a responsibility card
--
-- Chase (Nov 2026): the cards are a responsibility chart. A partner marks a
-- card done on a day, the other one sees it, and the running count is what
-- settles "I'm doing more than you".
--
--   * done_by    — who did it. Always the person who tapped: nobody can mark
--                  a job done on their partner's behalf.
--   * done_on    — the day, in the phone's own calendar (the app sends it).
--                  A DATE, not a timestamp: "Saturday" must not move when the
--                  couple crosses a time zone.
--   * undone_at  — soft delete, the rule from migration 024. A mis-tap is
--                  undone by setting this, never by deleting the row.
--
-- One live mark per person per card per day (the partial unique index), so a
-- double tap is one mark.
--
-- Account deletion (023) needs no change:
--   * solo    — the couple row is deleted and its marks cascade with it;
--   * linked  — done_by is ON DELETE SET NULL, so the marks stay in the
--               partner's history without the leaver's name.
--
-- Additive and idempotent: safe to run twice.

CREATE TABLE IF NOT EXISTS public.responsibility_card_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.responsibility_cards(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  done_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  done_on DATE NOT NULL,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.responsibility_card_completions IS
  'One partner marking one responsibility card done on one day.';
COMMENT ON COLUMN public.responsibility_card_completions.done_on IS
  'The day it was done, in the calendar of the phone that marked it.';
COMMENT ON COLUMN public.responsibility_card_completions.undone_at IS
  'Soft delete: the mark was taken back.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_completions_once_a_day
  ON public.responsibility_card_completions (card_id, done_by, done_on)
  WHERE undone_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_completions_couple_day
  ON public.responsibility_card_completions (couple_id, done_on DESC)
  WHERE undone_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.responsibility_card_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple members can view card completions" ON public.responsibility_card_completions;
CREATE POLICY "Couple members can view card completions"
  ON public.responsibility_card_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- You mark your own work, on a card that belongs to your couple.
DROP POLICY IF EXISTS "Partners can mark their own card completions" ON public.responsibility_card_completions;
CREATE POLICY "Partners can mark their own card completions"
  ON public.responsibility_card_completions FOR INSERT
  WITH CHECK (
    done_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.responsibility_cards rc
      WHERE rc.id = card_id
        AND rc.couple_id = responsibility_card_completions.couple_id
    )
  );

-- Only your own mark can be taken back, and it stays yours.
DROP POLICY IF EXISTS "Partners can take back their own card completions" ON public.responsibility_card_completions;
CREATE POLICY "Partners can take back their own card completions"
  ON public.responsibility_card_completions FOR UPDATE
  USING (done_by = auth.uid())
  WITH CHECK (done_by = auth.uid());

-- No DELETE policy on purpose: the app soft-deletes (undone_at).

-- ---------------------------------------------------------------------------
-- Realtime: a mark on one phone shows on the other.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'responsibility_card_completions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responsibility_card_completions;
  END IF;
END $$;

ALTER TABLE public.responsibility_card_completions REPLICA IDENTITY FULL;
