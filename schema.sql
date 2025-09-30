-- Duo Decide App Database Schema
-- This file contains the complete database schema for Supabase
-- Run this in your Supabase SQL editor to create all tables and policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create couples table (user relationships)
CREATE TABLE IF NOT EXISTS couples (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure users are different
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    
    -- Ensure each user can only be in one couple
    CONSTRAINT unique_user1 UNIQUE (user1_id),
    CONSTRAINT unique_user2 UNIQUE (user2_id)
);

-- Create option_lists table (reusable option templates)
CREATE TABLE IF NOT EXISTS option_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create option_list_items table (items within option lists)
CREATE TABLE IF NOT EXISTS option_list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    option_list_id UUID NOT NULL REFERENCES option_lists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create decisions table
CREATE TABLE IF NOT EXISTS decisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATE,
    creator_id UUID NOT NULL,
    partner_id UUID NOT NULL,
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('vote', 'poll')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'voted', 'completed')),
    decided_by UUID,
    decided_at TIMESTAMP WITH TIME ZONE,
    final_decision VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure creator and partner are part of the couple
    CONSTRAINT creator_in_couple CHECK (
        (creator_id = (SELECT user1_id FROM couples WHERE id = couple_id)) OR 
        (creator_id = (SELECT user2_id FROM couples WHERE id = couple_id))
    ),
    CONSTRAINT partner_in_couple CHECK (
        (partner_id = (SELECT user1_id FROM couples WHERE id = couple_id)) OR 
        (partner_id = (SELECT user2_id FROM couples WHERE id = couple_id))
    )
);

-- Create decision_options table
CREATE TABLE IF NOT EXISTS decision_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    votes INTEGER DEFAULT 0,
    eliminated_in_round INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    option_id UUID NOT NULL REFERENCES decision_options(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can only vote once per round per decision
    CONSTRAINT unique_vote_per_round UNIQUE (decision_id, user_id, round),
    
    -- Ensure user is part of the couple for this decision
    CONSTRAINT user_in_decision_couple CHECK (
        user_id IN (
            SELECT creator_id FROM decisions WHERE id = decision_id
            UNION
            SELECT partner_id FROM decisions WHERE id = decision_id
        )
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_couples_user1_id ON couples(user1_id);
CREATE INDEX IF NOT EXISTS idx_couples_user2_id ON couples(user2_id);
CREATE INDEX IF NOT EXISTS idx_decisions_couple_id ON decisions(couple_id);
CREATE INDEX IF NOT EXISTS idx_decisions_creator_id ON decisions(creator_id);
CREATE INDEX IF NOT EXISTS idx_decisions_partner_id ON decisions(partner_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decision_options_decision_id ON decision_options(decision_id);
CREATE INDEX IF NOT EXISTS idx_votes_decision_id ON votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_round ON votes(decision_id, round);
CREATE INDEX IF NOT EXISTS idx_option_lists_couple_id ON option_lists(couple_id);
CREATE INDEX IF NOT EXISTS idx_option_list_items_option_list_id ON option_list_items(option_list_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_option_lists_updated_at BEFORE UPDATE ON option_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couples table
CREATE POLICY "Users can view their own couple" ON couples
    FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

CREATE POLICY "Users can create couples" ON couples
    FOR INSERT WITH CHECK (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

CREATE POLICY "Users can update their own couple" ON couples
    FOR UPDATE USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

-- RLS Policies for decisions table
CREATE POLICY "Users can view decisions from their couple" ON decisions
    FOR SELECT USING (
        auth.uid() = creator_id OR auth.uid() = partner_id
    );

CREATE POLICY "Users can create decisions for their couple" ON decisions
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id AND 
        couple_id IN (
            SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can update decisions they created" ON decisions
    FOR UPDATE USING (
        auth.uid() = creator_id
    );

CREATE POLICY "Users can delete decisions they created" ON decisions
    FOR DELETE USING (
        auth.uid() = creator_id
    );

-- RLS Policies for decision_options table
CREATE POLICY "Users can view options for their couple's decisions" ON decision_options
    FOR SELECT USING (
        decision_id IN (
            SELECT id FROM decisions 
            WHERE creator_id = auth.uid() OR partner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create options for their decisions" ON decision_options
    FOR INSERT WITH CHECK (
        decision_id IN (
            SELECT id FROM decisions WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update options for their decisions" ON decision_options
    FOR UPDATE USING (
        decision_id IN (
            SELECT id FROM decisions WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete options for their decisions" ON decision_options
    FOR DELETE USING (
        decision_id IN (
            SELECT id FROM decisions WHERE creator_id = auth.uid()
        )
    );

-- RLS Policies for votes table
CREATE POLICY "Users can view votes for their couple's decisions" ON votes
    FOR SELECT USING (
        decision_id IN (
            SELECT id FROM decisions 
            WHERE creator_id = auth.uid() OR partner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create votes for their couple's decisions" ON votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        decision_id IN (
            SELECT id FROM decisions 
            WHERE creator_id = auth.uid() OR partner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own votes" ON votes
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- RLS Policies for option_lists table
CREATE POLICY "Users can view option lists for their couple" ON option_lists
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can create option lists for their couple" ON option_lists
    FOR INSERT WITH CHECK (
        couple_id IN (
            SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can update option lists for their couple" ON option_lists
    FOR UPDATE USING (
        couple_id IN (
            SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete option lists for their couple" ON option_lists
    FOR DELETE USING (
        couple_id IN (
            SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- RLS Policies for option_list_items table
CREATE POLICY "Users can view items for their couple's option lists" ON option_list_items
    FOR SELECT USING (
        option_list_id IN (
            SELECT id FROM option_lists 
            WHERE couple_id IN (
                SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create items for their couple's option lists" ON option_list_items
    FOR INSERT WITH CHECK (
        option_list_id IN (
            SELECT id FROM option_lists 
            WHERE couple_id IN (
                SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update items for their couple's option lists" ON option_list_items
    FOR UPDATE USING (
        option_list_id IN (
            SELECT id FROM option_lists 
            WHERE couple_id IN (
                SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete items for their couple's option lists" ON option_list_items
    FOR DELETE USING (
        option_list_id IN (
            SELECT id FROM option_lists 
            WHERE couple_id IN (
                SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
            )
        )
    );

-- Function to automatically update vote counts when votes are inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_option_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE decision_options 
        SET votes = (
            SELECT COUNT(*) FROM votes 
            WHERE option_id = NEW.option_id AND decision_id = NEW.decision_id
        )
        WHERE id = NEW.option_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update old option count
        UPDATE decision_options 
        SET votes = (
            SELECT COUNT(*) FROM votes 
            WHERE option_id = OLD.option_id AND decision_id = OLD.decision_id
        )
        WHERE id = OLD.option_id;
        
        -- Update new option count
        UPDATE decision_options 
        SET votes = (
            SELECT COUNT(*) FROM votes 
            WHERE option_id = NEW.option_id AND decision_id = NEW.decision_id
        )
        WHERE id = NEW.option_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE decision_options 
        SET votes = (
            SELECT COUNT(*) FROM votes 
            WHERE option_id = OLD.option_id AND decision_id = OLD.decision_id
        )
        WHERE id = OLD.option_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for vote count updates
CREATE TRIGGER update_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_option_vote_count();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable real-time for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE decision_options;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE couples;
