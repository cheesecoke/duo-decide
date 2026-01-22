-- Allow user2_id to be null initially (partner hasn't signed up yet)
ALTER TABLE couples
ALTER COLUMN user2_id DROP NOT NULL;

-- Add a check constraint to ensure at least user1_id is set
-- Drop first in case it already exists, then re-add (idempotent)
ALTER TABLE couples
DROP CONSTRAINT IF EXISTS couples_user1_required;

ALTER TABLE couples
ADD CONSTRAINT couples_user1_required CHECK (user1_id IS NOT NULL);
