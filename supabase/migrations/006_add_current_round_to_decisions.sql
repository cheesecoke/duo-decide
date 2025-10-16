-- Add current_round column to decisions table
-- This field tracks which round a poll is currently on (1, 2, or 3)

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1 CHECK (current_round IN (1, 2, 3));

-- Set current_round to 1 for all existing decisions
UPDATE decisions
SET current_round = 1
WHERE current_round IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN decisions.current_round IS 'Current round for poll-type decisions (1, 2, or 3). Always 1 for vote-type decisions.';

