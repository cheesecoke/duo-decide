-- Create trigger to update decisions.updated_at when a vote is cast
-- This allows both partners to receive vote notifications via the decisions channel
-- (votes table SELECT is RLS-blocked for cross-partner events, but decisions updates reach both)

CREATE OR REPLACE FUNCTION notify_decision_on_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Touch the decision's updated_at timestamp
  -- This triggers a realtime UPDATE event on the decisions table
  -- Both partners have couple-level SELECT access to decisions, so they receive the event
  UPDATE decisions
  SET updated_at = NOW()
  WHERE id = NEW.decision_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_decision_on_vote_insert ON votes;

-- Create trigger on vote insert
CREATE TRIGGER notify_decision_on_vote_insert
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION notify_decision_on_vote();
