-- Migration 025: responsibility cards
--
-- Chase (Nov 2026): a couple divides the work of running their life with a
-- deck of cards. Each card is one responsibility ("Trash & recycling",
-- "Weeknight dinners"), and each card is held by exactly one partner, or by
-- nobody yet.
--
--   * holder_id   — who holds the card. NULL = not dealt yet. One holder,
--                   never both: the point of a card is that one person owns
--                   the whole job.
--   * category    — home | out | care | us. A fixed set the app labels.
--   * daily       — the job comes round every day and cannot be put off.
--   * deck_key    — set on cards that came from the app's starter deck
--                   (lib/responsibility-deck.ts). UNIQUE per couple, so both
--                   partners tapping "Start with the starter deck" at once
--                   still gives one deck. NULL on cards the couple wrote.
--   * removed_at  — soft delete, the rule from migration 024: nothing is
--                   hard-deleted from the app. A removed card is hidden by
--                   the app's read (lib/database.ts), not by RLS, so the
--                   partner's realtime subscription still hears the removal.
--
-- Account deletion (023) needs no change:
--   * solo    — the couple row is deleted, and its cards cascade with it;
--   * linked  — the leaver's profile is deleted, and holder_id / created_by /
--               removed_by are ON DELETE SET NULL, so their cards go back to
--               "not dealt" for the partner who stays.
--
-- Additive and idempotent: safe to run twice.

CREATE TABLE IF NOT EXISTS public.responsibility_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  category TEXT NOT NULL DEFAULT 'home' CHECK (category IN ('home', 'out', 'care', 'us')),
  daily BOOLEAN NOT NULL DEFAULT FALSE,
  holder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deck_key TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT responsibility_cards_deck_key_once UNIQUE (couple_id, deck_key)
);

COMMENT ON TABLE public.responsibility_cards IS
  'One responsibility a couple shares out. Held by one partner, or nobody yet.';
COMMENT ON COLUMN public.responsibility_cards.holder_id IS
  'The partner who holds the card. NULL = not dealt.';
COMMENT ON COLUMN public.responsibility_cards.deck_key IS
  'Identity of a starter-deck card (lib/responsibility-deck.ts). NULL on cards the couple wrote.';
COMMENT ON COLUMN public.responsibility_cards.removed_at IS
  'Soft delete. The app never shows a removed card again.';

CREATE INDEX IF NOT EXISTS idx_responsibility_cards_couple
  ON public.responsibility_cards (couple_id)
  WHERE removed_at IS NULL;

DROP TRIGGER IF EXISTS update_responsibility_cards_updated_at ON public.responsibility_cards;
CREATE TRIGGER update_responsibility_cards_updated_at
  BEFORE UPDATE ON public.responsibility_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.responsibility_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple members can view responsibility cards" ON public.responsibility_cards;
CREATE POLICY "Couple members can view responsibility cards"
  ON public.responsibility_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- A card can only be dealt to one of the couple's own two people.
DROP POLICY IF EXISTS "Couple members can add responsibility cards" ON public.responsibility_cards;
CREATE POLICY "Couple members can add responsibility cards"
  ON public.responsibility_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND (holder_id IS NULL OR holder_id = c.user1_id OR holder_id = c.user2_id)
    )
  );

DROP POLICY IF EXISTS "Couple members can update responsibility cards" ON public.responsibility_cards;
CREATE POLICY "Couple members can update responsibility cards"
  ON public.responsibility_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND (holder_id IS NULL OR holder_id = c.user1_id OR holder_id = c.user2_id)
    )
  );

-- No DELETE policy on purpose: the app soft-deletes (removed_at).

-- ---------------------------------------------------------------------------
-- Realtime: a card dealt on one phone moves on the other.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'responsibility_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responsibility_cards;
  END IF;
END $$;

ALTER TABLE public.responsibility_cards REPLICA IDENTITY FULL;
