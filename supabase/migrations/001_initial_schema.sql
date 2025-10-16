-- Duo App - Initial Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  couple_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Couples table (links two partners)
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id) NOT NULL,
  user2_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Add foreign key from profiles to couples
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_couple
  FOREIGN KEY (couple_id) REFERENCES couples(id);

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

-- Option lists table (reusable option lists)
CREATE TABLE IF NOT EXISTS option_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- List options table (items in option lists)
CREATE TABLE IF NOT EXISTS list_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES option_lists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_options ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own and their partner's profile
CREATE POLICY "Users can view their couple's profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Profiles: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Couples: Users can view their own couple
CREATE POLICY "Users can view own couple"
  ON couples FOR SELECT
  USING (
    user1_id = auth.uid() OR
    user2_id = auth.uid()
  );

-- Couples: Users can create couples
CREATE POLICY "Users can create couples"
  ON couples FOR INSERT
  WITH CHECK (
    user1_id = auth.uid() OR
    user2_id = auth.uid()
  );

-- Decisions: Users can view decisions for their couple
CREATE POLICY "Users can view couple decisions"
  ON decisions FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Decisions: Users can create decisions for their couple
CREATE POLICY "Users can create decisions"
  ON decisions FOR INSERT
  WITH CHECK (
    creator_id = auth.uid() AND
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Decisions: Users can update decisions they created
CREATE POLICY "Users can update own decisions"
  ON decisions FOR UPDATE
  USING (
    creator_id = auth.uid() OR
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Decisions: Users can delete decisions they created
CREATE POLICY "Users can delete own decisions"
  ON decisions FOR DELETE
  USING (creator_id = auth.uid());

-- Decision Options: Users can view options for their couple's decisions
CREATE POLICY "Users can view couple decision options"
  ON decision_options FOR SELECT
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Decision Options: Users can create options for their decisions
CREATE POLICY "Users can create decision options"
  ON decision_options FOR INSERT
  WITH CHECK (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

-- Decision Options: Users can update options for their decisions
CREATE POLICY "Users can update decision options"
  ON decision_options FOR UPDATE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

-- Decision Options: Users can delete options for their decisions
CREATE POLICY "Users can delete decision options"
  ON decision_options FOR DELETE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE creator_id = auth.uid()
    )
  );

-- Votes: Users can view their own votes
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT
  USING (user_id = auth.uid());

-- Votes: Users can create votes
CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Option Lists: Users can view lists for their couple
CREATE POLICY "Users can view couple option lists"
  ON option_lists FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Option Lists: Users can create lists for their couple
CREATE POLICY "Users can create option lists"
  ON option_lists FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Option Lists: Users can update lists for their couple
CREATE POLICY "Users can update option lists"
  ON option_lists FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Option Lists: Users can delete lists for their couple
CREATE POLICY "Users can delete option lists"
  ON option_lists FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );

-- List Options: Users can view options for their couple's lists
CREATE POLICY "Users can view couple list options"
  ON list_options FOR SELECT
  USING (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- List Options: Users can create options for their lists
CREATE POLICY "Users can create list options"
  ON list_options FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- List Options: Users can update options for their lists
CREATE POLICY "Users can update list options"
  ON list_options FOR UPDATE
  USING (
    list_id IN (
      SELECT id FROM option_lists WHERE couple_id IN (
        SELECT couple_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- List Options: Users can delete options for their lists
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
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for decisions
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for option_lists
CREATE TRIGGER update_option_lists_updated_at BEFORE UPDATE ON option_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE couples IS 'Links two partners together';
COMMENT ON TABLE decisions IS 'Decisions that couples make together';
COMMENT ON TABLE decision_options IS 'Options for each decision';
COMMENT ON TABLE votes IS 'Votes cast by users on decision options';
COMMENT ON TABLE option_lists IS 'Reusable lists of options';
COMMENT ON TABLE list_options IS 'Items in option lists';
