-- Add creator_id to option_lists so only the creator can delete their list
ALTER TABLE option_lists
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN option_lists.creator_id IS 'User who created the list; only they can delete it';
