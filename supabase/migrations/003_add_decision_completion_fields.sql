-- Add decision completion tracking fields
-- This migration adds fields needed to track who decided and when

-- Add the missing fields to the decisions table
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS final_decision UUID REFERENCES decision_options(id);

-- Update the status check constraint to include all possible statuses
ALTER TABLE decisions
  DROP CONSTRAINT IF EXISTS decisions_status_check;

ALTER TABLE decisions
  ADD CONSTRAINT decisions_status_check
  CHECK (status IN ('active', 'pending', 'voted', 'completed'));

-- Update default status to 'pending' to match TypeScript types
ALTER TABLE decisions
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add comments for the new fields
COMMENT ON COLUMN decisions.decided_by IS 'User who made the final decision';
COMMENT ON COLUMN decisions.decided_at IS 'When the decision was finalized';
COMMENT ON COLUMN decisions.final_decision IS 'The option that was chosen';
