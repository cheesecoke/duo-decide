-- Allow user2_id to be null initially (partner hasn't signed up yet)
ALTER TABLE couples 
ALTER COLUMN user2_id DROP NOT NULL;

-- Add a check constraint to ensure at least user1_id is set
ALTER TABLE couples
ADD CONSTRAINT couples_user1_required CHECK (user1_id IS NOT NULL);
