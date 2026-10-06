-- App Store review demo couple.
--
-- Apple's reviewer needs a working login, and Duo only makes sense as a
-- couple. This links two existing accounts and gives them a small, realistic
-- history plus live decisions in every state the reviewer should see.
--
-- 1. Sign up both accounts in the app first (e.g. review-a@duo-decide.com and
--    review-b@duo-decide.com) and confirm their emails.
-- 2. Set the two emails below, then run this in the Supabase SQL editor.
-- 3. Give Apple account A's email + password in App Review notes, and say
--    "B is the partner account; votes from B are pre-filled".
--
-- Safe to re-run: it removes the pair's previous couple data first. It never
-- touches any other account.

DO $$
DECLARE
  v_email_a TEXT := 'review-a@duo-decide.com';   -- the login Apple gets
  v_email_b TEXT := 'review-b@duo-decide.com';   -- the partner
  v_a UUID;
  v_b UUID;
  v_couple UUID;
  v_d UUID;
  v_o1 UUID;
  v_o2 UUID;
  v_o3 UUID;
  v_list UUID;
  v_items_table TEXT;
BEGIN
  SELECT id INTO v_a FROM public.profiles WHERE lower(email) = lower(v_email_a);
  SELECT id INTO v_b FROM public.profiles WHERE lower(email) = lower(v_email_b);
  IF v_a IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'Sign up % and % in the app first', v_email_a, v_email_b;
  END IF;

  UPDATE public.profiles SET display_name = 'Alex' WHERE id = v_a;
  UPDATE public.profiles SET display_name = 'Sam' WHERE id = v_b;

  -- Clear any earlier run (decisions cascade to options and votes).
  FOR v_couple IN
    SELECT id FROM public.couples
    WHERE user1_id IN (v_a, v_b) OR user2_id IN (v_a, v_b)
  LOOP
    UPDATE public.profiles SET couple_id = NULL WHERE couple_id = v_couple;
    DELETE FROM public.decisions WHERE couple_id = v_couple;
    DELETE FROM public.option_lists WHERE couple_id = v_couple;
    DELETE FROM public.couples WHERE id = v_couple;
  END LOOP;

  INSERT INTO public.couples (user1_id, user2_id) VALUES (v_a, v_b) RETURNING id INTO v_couple;
  UPDATE public.profiles SET couple_id = v_couple WHERE id IN (v_a, v_b);

  -- History: three completed decisions.
  INSERT INTO public.decisions (couple_id, creator_id, partner_id, title, description, type, status, current_round, created_at)
  VALUES (v_couple, v_a, v_b, 'Dinner on Friday', 'Somewhere we can walk to.', 'vote', 'completed', 1, now() - interval '9 days')
  RETURNING id INTO v_d;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Ramen') RETURNING id INTO v_o1;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Tacos');
  INSERT INTO public.votes (decision_id, user_id, option_id, round) VALUES (v_d, v_a, v_o1, 1), (v_d, v_b, v_o1, 1);
  UPDATE public.decisions SET decided_by = v_b, decided_at = now() - interval '8 days', final_decision = v_o1 WHERE id = v_d;

  INSERT INTO public.decisions (couple_id, creator_id, partner_id, title, type, status, current_round, created_at)
  VALUES (v_couple, v_b, v_a, 'Movie night pick', 'vote', 'completed', 1, now() - interval '5 days')
  RETURNING id INTO v_d;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Dune: Part Two') RETURNING id INTO v_o1;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Past Lives');
  INSERT INTO public.votes (decision_id, user_id, option_id, round) VALUES (v_d, v_a, v_o1, 1), (v_d, v_b, v_o1, 1);
  UPDATE public.decisions SET decided_by = v_a, decided_at = now() - interval '5 days', final_decision = v_o1 WHERE id = v_d;

  INSERT INTO public.decisions (couple_id, creator_id, partner_id, title, type, status, current_round, created_at)
  VALUES (v_couple, v_a, v_b, 'Weekend hike', 'vote', 'completed', 1, now() - interval '2 days')
  RETURNING id INTO v_d;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Lake trail') RETURNING id INTO v_o1;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Ridge loop');
  INSERT INTO public.votes (decision_id, user_id, option_id, round) VALUES (v_d, v_a, v_o1, 1), (v_d, v_b, v_o1, 1);
  UPDATE public.decisions SET decided_by = v_b, decided_at = now() - interval '2 days', final_decision = v_o1 WHERE id = v_d;

  -- Live: a vote where the partner has already voted (the reviewer, as A, can
  -- finish it).
  INSERT INTO public.decisions (couple_id, creator_id, partner_id, title, description, deadline, type, status, current_round)
  VALUES (v_couple, v_b, v_a, 'Where should we go for our anniversary?', 'Somewhere neither of us has been.', now() + interval '6 days', 'vote', 'voted', 1)
  RETURNING id INTO v_d;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Lisbon') RETURNING id INTO v_o1;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Kyoto') RETURNING id INTO v_o2;
  INSERT INTO public.decision_options (decision_id, title) VALUES (v_d, 'Mexico City');
  INSERT INTO public.votes (decision_id, user_id, option_id, round) VALUES (v_d, v_b, v_o2, 1);

  -- Live: a poll in round 1, nobody has voted yet (A created it).
  INSERT INTO public.decisions (couple_id, creator_id, partner_id, title, deadline, type, status, current_round)
  VALUES (v_couple, v_a, v_b, 'New couch colour', now() + interval '3 days', 'poll', 'pending', 1)
  RETURNING id INTO v_d;
  INSERT INTO public.decision_options (decision_id, title) VALUES
    (v_d, 'Sage'), (v_d, 'Oat'), (v_d, 'Charcoal'), (v_d, 'Terracotta');

  -- An option list.
  INSERT INTO public.option_lists (couple_id, creator_id, title, description)
  VALUES (v_couple, v_a, 'Date night ideas', 'Things we keep saying we should do.')
  RETURNING id INTO v_list;

  SELECT CASE
    WHEN to_regclass('public.option_list_items') IS NOT NULL THEN 'option_list_items'
    WHEN to_regclass('public.list_options') IS NOT NULL THEN 'list_options'
  END INTO v_items_table;

  IF v_items_table = 'option_list_items' THEN
    INSERT INTO public.option_list_items (option_list_id, title)
    VALUES (v_list, 'Cooking class'), (v_list, 'Board game café'), (v_list, 'Sunset picnic');
  ELSIF v_items_table = 'list_options' THEN
    INSERT INTO public.list_options (list_id, title)
    VALUES (v_list, 'Cooking class'), (v_list, 'Board game café'), (v_list, 'Sunset picnic');
  END IF;

  RAISE NOTICE 'Demo couple % ready: % (login) + %', v_couple, v_email_a, v_email_b;
END $$;
