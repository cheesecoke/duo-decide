-- Repair vote-mode decisions stuck since PR #10 (Jul 4, 2026).
--
-- PR #10 made vote mode wait for both partners, but the creator is blocked
-- from voting on their own vote, so a partner's pick left the decision at
-- status 'voted' forever instead of completing it. The app is fixed; this
-- completes the rows that were already stuck, exactly as the app would have:
-- the partner's (non-creator's) one vote becomes the decision.
--
-- Run in the Supabase SQL editor. Step 1 only reads. Step 2 changes data.

-- Step 1: preview what will be completed.
SELECT d.id, d.title, d.created_at, v.user_id AS decided_by, o.title AS pick
FROM public.decisions d
JOIN public.votes v ON v.decision_id = d.id AND v.round = 1
JOIN public.decision_options o ON o.id = v.option_id
WHERE d.type = 'vote'
  AND d.status IS DISTINCT FROM 'completed'
  AND v.user_id IS DISTINCT FROM d.creator_id
  AND (SELECT count(*) FROM public.votes v2 WHERE v2.decision_id = d.id) = 1
ORDER BY d.created_at;

-- Step 2: complete them.
UPDATE public.decisions d
SET status = 'completed',
    final_decision = v.option_id,
    decided_by = v.user_id,
    decided_at = coalesce(v.created_at, now())
FROM public.votes v
WHERE v.decision_id = d.id
  AND v.round = 1
  AND d.type = 'vote'
  AND d.status IS DISTINCT FROM 'completed'
  AND v.user_id IS DISTINCT FROM d.creator_id
  AND (SELECT count(*) FROM public.votes v2 WHERE v2.decision_id = d.id) = 1;
