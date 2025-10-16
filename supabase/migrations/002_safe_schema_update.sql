-- Duo App - Safe Schema Update
-- This migration safely updates the schema by dropping and recreating policies

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their couple's profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Couples policies
DROP POLICY IF EXISTS "Users can view own couple" ON couples;
DROP POLICY IF EXISTS "Users can create couples" ON couples;

-- Decisions policies
DROP POLICY IF EXISTS "Users can view couple decisions" ON decisions;
DROP POLICY IF EXISTS "Users can create decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can delete own decisions" ON decisions;

-- Decision Options policies
DROP POLICY IF EXISTS "Users can view couple decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can create decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can update decision options" ON decision_options;
DROP POLICY IF EXISTS "Users can delete decision options" ON decision_options;

-- Votes policies
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Users can create votes" ON votes;

-- Option Lists policies
DROP POLICY IF EXISTS "Users can view couple option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can create option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can update option lists" ON option_lists;
DROP POLICY IF EXISTS "Users can delete option lists" ON option_lists;

-- List Options policies
DROP POLICY IF EXISTS "Users can view couple list options" ON list_options;
DROP POLICY IF EXISTS "Users can create list options" ON list_options;
DROP POLICY IF EXISTS "Users can update list options" ON list_options;
DROP POLICY IF EXISTS "Users can delete list options" ON list_options;

-- ============================================================================
-- RECREATE TABLES (IF NOT EXISTS)
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  couple_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couples table
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id) NOT NULL,
  user2_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Add foreign key from profiles to couples (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_couple'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT fk_profiles_couple
      FOREIGN KEY (couple_id) REFERENCES couples(id);
  END IF;
END $$;

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  partner_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL CHECK (type IN ('vote', 'poll')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  current_round INTEGER DEFAULT 1 CHECK (current_round IN (1, 2, 3)),
  round_complete BOOLEAN DEFAULT false,
  selected_option_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decision options table
CREATE TABLE IF NOT EXISTS decision_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  eliminated_in_round INTEGER CHECK (eliminated_in_round IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  option_id UUID REFERENCES decision_options(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL CHECK (round IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(decision_id, user_id, round)
);

-- Option lists table
CREATE TABLE IF NOT EXISTS option_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- List options table
CREATE TABLE IF NOT EXISTS list_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES option_lists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (safe to create if not exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON profiles(couple_id);
CREATE INDEX IF NOT EXISTS idx_decisions_couple_id ON decisions(couple_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_options_decision_id ON decision_options(decision_id);
CREATE INDEX IF NOT EXISTS idx_votes_decision_id ON votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_round ON votes(user_id, round);
CREATE INDEX IF NOT EXISTS idx_option_lists_couple_id ON option_lists(couple_id);
CREATE INDEX IF NOT EXISTS idx_list_options_list_id ON list_options(list_id);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_options ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Profiles Policies
CREATE POLICY "Users can view their couple's profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Couples Policies
CREATE POLICY "Users can view own couple"
  ON couples FOR SELECT
  USING (
    user1_id = auth.uid() OR
    user2_id = auth.uid()
  );

CREATE POLICY "Users can create couples"
  ON couples FOR INSERT
  WITH CHECK (
    user1_id = auth.uid() OR
    user2_id = auth.uid()
  );

-- Decisions Policies
CREATE POLICY "Users can view couple decisions"
  ON decisions FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create decisions"
  ON decisions FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own decisions"
  ON decisions FOR UPDATE
  USING (
    creator_id = auth.uid() OR
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own decisions"
  ON decisions FOR DELETE
  USING (creator_id = auth.uid());

-- Decision Options Policies
CREATE POLICY "Users can view couple decision options"
  ON decision_options FOR SELECT
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
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

-- Votes Policies
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Option Lists Policies
CREATE POLICY "Users can view couple option lists"
  ON option_lists FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create option lists"
  ON option_lists FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update option lists"
  ON option_lists FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete option lists"
  ON option_lists FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- List Options Policies
CREATE POLICY "Users can view couple list options"
  ON list_options FOR SELECT
  USING (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create list options"
  ON list_options FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update list options"
  ON list_options FOR UPDATE
  USING (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete list options"
  ON list_options FOR DELETE
  USING (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS (drop and recreate)
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_decisions_updated_at ON decisions;
DROP TRIGGER IF EXISTS update_option_lists_updated_at ON option_lists;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_option_lists_updated_at BEFORE UPDATE ON option_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
