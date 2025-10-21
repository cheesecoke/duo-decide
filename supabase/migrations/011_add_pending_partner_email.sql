-- Add field to track pending partner invitations
ALTER TABLE couples 
ADD COLUMN pending_partner_email TEXT;

-- Add index for faster lookups when partner signs up
CREATE INDEX idx_couples_pending_partner ON couples(pending_partner_email) 
WHERE pending_partner_email IS NOT NULL;
