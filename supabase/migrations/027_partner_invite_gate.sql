-- 027: Gate partner invite emails.
--
-- The send-partner-invite edge function used to email any address it was
-- given, as hello@duo-decide.com, to anyone holding the public anon key.
-- It now calls claim_partner_invite() as the signed-in user first. That
-- function decides whether the send may happen and records it:
--
--   - the caller must be signed in (auth.uid()), in a couple, and not yet paired
--   - the address must look like an email and not be the caller's own
--   - at most 5 sends per caller per hour and 10 per day
--   - at most 3 sends to one address per day, across all callers
--
-- It returns the inviter's display name from profiles, so the email no longer
-- trusts a name sent by the client.
--
-- Expand-only: a new table and a new function. Nothing existing changes, so
-- app builds already in the wild keep working (they call the edge function,
-- not this).

CREATE TABLE IF NOT EXISTS public.partner_invite_sends (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_invite_sends_user
  ON public.partner_invite_sends (user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_partner_invite_sends_email
  ON public.partner_invite_sends (partner_email, sent_at);

-- RLS on with no policies: only claim_partner_invite (SECURITY DEFINER) reads
-- or writes this table.
ALTER TABLE public.partner_invite_sends ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_partner_invite(p_partner_email text)
RETURNS text AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_partner_email, '')));
  v_own_email text;
  v_couple public.couples%ROWTYPE;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF length(v_email) > 254 OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22023';
  END IF;

  SELECT lower(email) INTO v_own_email FROM auth.users WHERE id = v_uid;
  IF v_own_email = v_email THEN
    RAISE EXCEPTION 'You cannot invite yourself' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_couple
  FROM public.couples
  WHERE user1_id = v_uid OR user2_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No couple found' USING ERRCODE = 'P0002';
  END IF;
  IF v_couple.user1_id IS NOT NULL AND v_couple.user2_id IS NOT NULL THEN
    RAISE EXCEPTION 'Already paired with a partner' USING ERRCODE = 'DD409';
  END IF;

  IF (SELECT count(*) FROM public.partner_invite_sends
      WHERE user_id = v_uid AND sent_at > now() - interval '1 hour') >= 5
  OR (SELECT count(*) FROM public.partner_invite_sends
      WHERE user_id = v_uid AND sent_at > now() - interval '1 day') >= 10
  OR (SELECT count(*) FROM public.partner_invite_sends
      WHERE partner_email = v_email AND sent_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'Too many invites. Try again later.' USING ERRCODE = 'DD429';
  END IF;

  INSERT INTO public.partner_invite_sends (user_id, partner_email) VALUES (v_uid, v_email);

  SELECT nullif(btrim(display_name), '') INTO v_name FROM public.profiles WHERE id = v_uid;
  RETURN left(coalesce(v_name, 'Your partner'), 60);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.claim_partner_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_partner_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_partner_invite(text) TO authenticated;

COMMENT ON FUNCTION public.claim_partner_invite(text) IS
  'Called by the send-partner-invite edge function as the signed-in user. Checks the caller may invite this address, enforces rate limits, records the send, and returns the inviter''s display name.';
