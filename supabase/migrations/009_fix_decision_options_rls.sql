-- Fix RLS policies for decision_options to allow both partners to manage options
-- This is needed for round progression where either partner can trigger option changes

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Users can create decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can update decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can delete decision options" ON decision_options;

-- Create new policy that allows both partners in the couple to INSERT options
CREATE POLICY "Users can create decision options"
  ON decision_options FOR INSERT
  WITH CHECK (
    decision_id IN (
      SELECT id FROM decisions WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Create new policy that allows both partners in the couple to UPDATE options
CREATE POLICY "Users can update decision options"
  ON decision_options FOR UPDATE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Create new policy that allows both partners in the couple to DELETE options
CREATE POLICY "Users can delete decision options"
  ON decision_options FOR DELETE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
