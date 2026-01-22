-- Add field to track pending partner invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'couples' AND column_name = 'pending_partner_email'
  ) THEN
    ALTER TABLE couples ADD COLUMN pending_partner_email TEXT;
  END IF;
END $$;

-- Add index for faster lookups when partner signs up (idempotent)
DROP INDEX IF EXISTS idx_couples_pending_partner;
CREATE INDEX idx_couples_pending_partner ON couples(pending_partner_email)
WHERE pending_partner_email IS NOT NULL;
