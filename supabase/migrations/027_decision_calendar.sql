-- Migration 027: what happens after a decision is decided
--
-- Chase (Nov 2026): Steph asked "want to join me at X on <date>?", Chase voted
-- yes, and then had to leave Duo and add it to the shared calendar by hand. A
-- decided card now offers one next action; "Add to calendar" is the first.
--
-- Three additions:
--
-- 1. decisions.event_on / event_time / event_tz — when the thing being decided
--    actually happens. NOT the deadline, which is "decide by".
--      * event_on    — the day. A DATE, not a timestamp: "Saturday the 12th"
--                      must not move when the couple crosses a time zone.
--      * event_time  — wall-clock start time, NULL = all day.
--      * event_tz    — the IANA zone of the phone that stored it
--                      ("America/Denver"), so the time can be handed to a
--                      calendar unambiguously. NULL = unknown.
--
-- 2. decision_calendar_adds — who put the decision on a calendar. One row per
--    (decision, person), not per decision: a couple without a shared calendar
--    can each add it to their own.
--      * state       — opened  : handed off to the calendar, not confirmed yet
--                      added   : on the calendar
--                      removed : taken back. Soft state, the rule from 024:
--                                the row is never deleted, and RLS does NOT
--                                hide it, so the partner's realtime
--                                subscription still hears the removal.
--      * confirmed   — true for a person's "Yes, added", a system sheet's
--                      "saved", or the API. A link hand-off cannot know.
--      * snapshot    — a hash of what/when/where at the time of adding
--                      (lib/calendar-link.ts eventSnapshot), so the card can
--                      say "the details changed since this was added".
--      * updated_at  — bumped by trigger on every write; an 'opened' older
--                      than ten minutes stops holding the partner back.
--
-- 3. action_events — insert-only counts of the next-action button: how often
--    it is shown, tapped, completed, or picked from the menu when it was not
--    suggested. No free text, on purpose: this is a tally, not a log of what
--    the couple decided. One row per (decision, person, action, event), so
--    'shown' is counted once however many times the card renders.
--      * couple_id and user_id are filled in by trigger, so the client sends
--        only the decision and the three enums.
--
-- Account deletion (023) needs no change:
--   * solo    — the couple row and its decisions are deleted, and all three
--               cascade with them;
--   * linked  — added_by / user_id are ON DELETE SET NULL, so the partner who
--               stays still sees that it is on the calendar, without the
--               leaver's name. (NULLs are distinct in a UNIQUE, so neither
--               constraint below is disturbed.)
--
-- Additive and idempotent: safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. When it happens
-- ---------------------------------------------------------------------------
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS event_on DATE,
  ADD COLUMN IF NOT EXISTS event_time TIME,
  ADD COLUMN IF NOT EXISTS event_tz TEXT;

COMMENT ON COLUMN public.decisions.event_on IS
  'The day the thing being decided happens. Not the deadline (decide by).';
COMMENT ON COLUMN public.decisions.event_time IS
  'Wall-clock start time on event_on. NULL = all day.';
COMMENT ON COLUMN public.decisions.event_tz IS
  'IANA time zone event_time is in. NULL = unknown.';

-- ---------------------------------------------------------------------------
-- 2. Who added it to a calendar
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_calendar_adds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('google_link', 'ics', 'system', 'google_api')),
  state TEXT NOT NULL CHECK (state IN ('opened', 'added', 'removed')),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  external_event_id TEXT,
  snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT decision_calendar_adds_once_each UNIQUE (decision_id, added_by)
);

COMMENT ON TABLE public.decision_calendar_adds IS
  'One partner putting one decided decision on a calendar.';
COMMENT ON COLUMN public.decision_calendar_adds.state IS
  'opened = handed off, unconfirmed. added = on the calendar. removed = taken back (soft).';
COMMENT ON COLUMN public.decision_calendar_adds.confirmed IS
  'True when a person, the system sheet or the API said it saved.';
COMMENT ON COLUMN public.decision_calendar_adds.snapshot IS
  'Hash of what/when/where when it was added, for "changed since".';

CREATE INDEX IF NOT EXISTS idx_decision_calendar_adds_couple
  ON public.decision_calendar_adds (couple_id);

DROP TRIGGER IF EXISTS update_decision_calendar_adds_updated_at ON public.decision_calendar_adds;
CREATE TRIGGER update_decision_calendar_adds_updated_at
  BEFORE UPDATE ON public.decision_calendar_adds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.decision_calendar_adds ENABLE ROW LEVEL SECURITY;

-- Every state, 'removed' included: hiding it here would hide the removal
-- from the partner's realtime subscription.
DROP POLICY IF EXISTS "Couple members can view calendar adds" ON public.decision_calendar_adds;
CREATE POLICY "Couple members can view calendar adds"
  ON public.decision_calendar_adds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- You record your own add, on one of your couple's own decisions.
DROP POLICY IF EXISTS "Partners can record their own calendar add" ON public.decision_calendar_adds;
CREATE POLICY "Partners can record their own calendar add"
  ON public.decision_calendar_adds FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = decision_id
        AND d.couple_id = decision_calendar_adds.couple_id
    )
  );

-- Only your own row, and it stays yours, on the same couple's decision.
DROP POLICY IF EXISTS "Partners can change their own calendar add" ON public.decision_calendar_adds;
CREATE POLICY "Partners can change their own calendar add"
  ON public.decision_calendar_adds FOR UPDATE
  USING (added_by = auth.uid())
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = decision_id
        AND d.couple_id = decision_calendar_adds.couple_id
    )
  );

-- No DELETE policy on purpose: taking it back is state = 'removed'.

-- ---------------------------------------------------------------------------
-- 3. Counting the next-action button
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.action_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('calendar', 'open_link', 'decide_next', 'plan')),
  event TEXT NOT NULL CHECK (event IN ('shown', 'tapped', 'completed', 'dismissed', 'menu_picked')),
  signal TEXT NOT NULL CHECK (signal IN ('event_date', 'parsed_date', 'url', 'yes_shape', 'none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT action_events_once_each UNIQUE (decision_id, user_id, action, event)
);

COMMENT ON TABLE public.action_events IS
  'Insert-only tally of the decided card''s next-action button. No decision text.';
COMMENT ON COLUMN public.action_events.signal IS
  'What made the app suggest (or not suggest) the action when the event happened.';

-- The client sends the decision and the three enums; who and which couple are
-- read here, so neither can be got wrong (or spoofed) by the app. Runs before
-- the INSERT policy below, which then checks the finished row.
CREATE OR REPLACE FUNCTION public.fill_action_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  IF NEW.couple_id IS NULL THEN
    SELECT d.couple_id INTO NEW.couple_id
    FROM public.decisions d
    WHERE d.id = NEW.decision_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_action_event ON public.action_events;
CREATE TRIGGER fill_action_event
  BEFORE INSERT ON public.action_events
  FOR EACH ROW EXECUTE FUNCTION public.fill_action_event();

ALTER TABLE public.action_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can count their own actions" ON public.action_events;
CREATE POLICY "Partners can count their own actions"
  ON public.action_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = decision_id
        AND d.couple_id = action_events.couple_id
    )
  );

-- Your own rows only. The app never reads this table; the policy is here so
-- the client's "insert, ignore if already counted" behaves the same on every
-- Postgres version. The totals are read with the service role.
DROP POLICY IF EXISTS "Partners can see their own action counts" ON public.action_events;
CREATE POLICY "Partners can see their own action counts"
  ON public.action_events FOR SELECT
  USING (user_id = auth.uid());

-- No UPDATE or DELETE policy on purpose: insert-only.

-- ---------------------------------------------------------------------------
-- Realtime: an add on one phone shows on the other. (action_events is not
-- published: nobody is listening for a tally.)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'decision_calendar_adds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_calendar_adds;
  END IF;
END $$;

ALTER TABLE public.decision_calendar_adds REPLICA IDENTITY FULL;
