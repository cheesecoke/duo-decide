-- Fix infinite recursion in RLS policies
-- The profiles policy was causing recursion by querying profiles within the profiles policy

-- Drop the problematic profiles policies
DROP POLICY IF EXISTS "Users can view their couple's profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop all existing policies first to ensure clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view partner profile" ON profiles;

-- Create simpler, non-recursive policies for profiles

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can view profiles in their couple (non-recursive approach)
CREATE POLICY "Users can view partner profile"
  ON profiles FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Also fix the decisions policies to use the simpler approach
DROP POLICY IF EXISTS "Users can view couple decisions" ON decisions;
DROP POLICY IF EXISTS "Users can create decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update own decisions" ON decisions;

-- Recreate decisions policies without profile lookup
CREATE POLICY "Users can view couple decisions"
  ON decisions FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can create decisions"
  ON decisions FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own decisions"
  ON decisions FOR UPDATE
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

-- Fix decision_options policies
DROP POLICY IF EXISTS "Users can view couple decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can create decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can update decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can delete decision options" ON decision_options;

CREATE POLICY "Users can view couple decision options"
  ON decision_options FOR SELECT
  USING (
    decision_id IN (
      SELECT d.id FROM decisions d
      INNER JOIN couples c ON d.couple_id = c.id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can create decision options"
  ON decision_options FOR INSERT
  WITH CHECK (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update decision options"
  ON decision_options FOR UPDATE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete decision options"
  ON decision_options FOR DELETE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

-- Fix option_lists policies
DROP POLICY IF EXISTS "Users can view couple option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can create option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can update option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can delete option lists" ON option_lists;

CREATE POLICY "Users can view couple option lists"
  ON option_lists FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can create option lists"
  ON option_lists FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update option lists"
  ON option_lists FOR UPDATE
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete option lists"
  ON option_lists FOR DELETE
  USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

-- Fix list_options policies
DROP POLICY IF EXISTS "Users can view couple list options" ON list_options;
DROP POLICY IF EXISTS "Users can create list options" ON list_options;
DROP POLICY IF EXISTS "Users can update list options" ON list_options;
DROP POLICY IF EXISTS "Users can delete list options" ON list_options;

CREATE POLICY "Users can view couple list options"
  ON list_options FOR SELECT
  USING (
    list_id IN (
      SELECT ol.id FROM option_lists ol
      INNER JOIN couples c ON ol.couple_id = c.id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can create list options"
  ON list_options FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT ol.id FROM option_lists ol
      INNER JOIN couples c ON ol.couple_id = c.id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update list options"
  ON list_options FOR UPDATE
  USING (
    list_id IN (
      SELECT ol.id FROM option_lists ol
      INNER JOIN couples c ON ol.couple_id = c.id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete list options"
  ON list_options FOR DELETE
  USING (
    list_id IN (
      SELECT ol.id FROM option_lists ol
      INNER JOIN couples c ON ol.couple_id = c.id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );
