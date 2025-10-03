# Duo - Implementation Guide

## Architecture Overview

### Application Flow
```
Welcome → Sign In → Decision Queue (main) ⇄ Options ⇄ History
                          ↓
                    Create Decision
                          ↓
                    Vote/Poll Flow
                          ↓
                       Complete
                          ↓
                       History
```

## Database Schema (Supabase)

### Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  couple_id UUID REFERENCES couples(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `couples`
```sql
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id) NOT NULL,
  user2_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);
```

#### `decisions`
```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  partner_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP,
  type TEXT NOT NULL CHECK (type IN ('vote', 'poll')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  current_round INTEGER DEFAULT 1 CHECK (current_round IN (1, 2, 3)),
  round_complete BOOLEAN DEFAULT false,
  selected_option_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `decision_options`
```sql
CREATE TABLE decision_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  eliminated_in_round INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `votes`
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  option_id UUID REFERENCES decision_options(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round IN (1, 2, 3)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(decision_id, user_id, round)
);
```

#### `option_lists`
```sql
CREATE TABLE option_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `list_options`
```sql
CREATE TABLE list_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES option_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Profiles: Users can read their own and their partner's profile
CREATE POLICY "Users can view their couple's profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
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

-- Votes: Users can only see their own votes in active rounds
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT
  USING (user_id = auth.uid());

-- Votes: Users can create votes
CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

## TypeScript Interfaces

### Core Types
```typescript
// Decision Types
export type DecisionType = 'vote' | 'poll';
export type DecisionStatus = 'active' | 'completed';
export type Round = 1 | 2 | 3;

// Base Decision Interface
export interface Decision {
  id: string;
  couple_id: string;
  creator_id: string;
  partner_id: string;
  title: string;
  description: string;
  deadline: string;
  type: DecisionType;
  status: DecisionStatus;
  created_at: string;
  updated_at: string;
}

// Vote Decision (simple)
export interface VoteDecision extends Decision {
  type: 'vote';
  options: DecisionOption[];
  selected_option_id?: string;
  expanded?: boolean;
}

// Poll Decision (multi-round)
export interface PollDecision extends Decision {
  type: 'poll';
  current_round: Round;
  round_complete: boolean;
  options: DecisionOption[];
  selected_option_id?: string;
  expanded?: boolean;
}

// Decision Option
export interface DecisionOption {
  id: string;
  decision_id: string;
  title: string;
  eliminated_in_round?: number;
  selected?: boolean;
  vote_count?: number;
}

// Vote
export interface Vote {
  id: string;
  decision_id: string;
  user_id: string;
  option_id: string;
  round: Round;
  created_at: string;
}

// Option List
export interface OptionList {
  id: string;
  couple_id: string;
  title: string;
  description: string;
  options: EditableOption[];
  expanded?: boolean;
  created_at: string;
  updated_at: string;
}

// Editable Option (for lists)
export interface EditableOption {
  id: string;
  list_id?: string;
  title: string;
}

// Couple
export interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

// Profile
export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  couple_id?: string;
  created_at: string;
  updated_at: string;
}
```

## Component Architecture

### Context Providers

#### ThemeProvider
```typescript
// Manages light/dark mode
interface ThemeContext {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
}
```

#### AuthProvider (Supabase)
```typescript
// Manages authentication state
interface AuthContext {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### DrawerProvider
```typescript
// Manages bottom drawer state
interface DrawerContext {
  isVisible: boolean;
  title: string;
  content: ReactNode;
  showDrawer: (title: string, content: ReactNode) => void;
  hideDrawer: () => void;
}
```

### Reusable Components

#### EditableOptionsList
- Inline editing of option lists
- Add/remove options
- Save/cancel functionality
- Used in: Decision creation, Option list management

#### CollapsibleCard (Decisions)
- Expandable decision cards
- Vote/Poll mode support
- Round indicators for polls
- Privacy controls
- Action buttons (decide, delete)

#### CollapsibleListCard (Option Lists)
- Expandable option list cards
- Inline editing integration
- Delete functionality
- Consistent with decision cards

## Data Services

### Decision Service
```typescript
class DecisionService {
  // Fetch decisions for couple
  async getDecisions(coupleId: string): Promise<Decision[]>

  // Create new decision
  async createDecision(data: CreateDecisionInput): Promise<Decision>

  // Vote on decision
  async voteOnDecision(decisionId: string, optionId: string, round: Round): Promise<Vote>

  // Check if both partners voted in round
  async checkRoundComplete(decisionId: string, round: Round): Promise<boolean>

  // Progress to next round (polls)
  async progressToNextRound(decisionId: string): Promise<void>

  // Calculate eliminated options
  async calculateEliminations(decisionId: string, round: Round): Promise<void>

  // Complete decision
  async completeDecision(decisionId: string, optionId: string): Promise<void>

  // Subscribe to decision changes
  subscribeToDecisions(coupleId: string, callback: (decision: Decision) => void): Subscription
}
```

### Option List Service
```typescript
class OptionListService {
  // Fetch option lists for couple
  async getOptionLists(coupleId: string): Promise<OptionList[]>

  // Create new option list
  async createOptionList(data: CreateOptionListInput): Promise<OptionList>

  // Update option list
  async updateOptionList(listId: string, data: UpdateOptionListInput): Promise<OptionList>

  // Delete option list
  async deleteOptionList(listId: string): Promise<void>

  // Update list options
  async updateListOptions(listId: string, options: EditableOption[]): Promise<void>
}
```

## Voting Logic Implementation

### Vote Mode (Simple)
```typescript
async function handleVote(decisionId: string, optionId: string) {
  // 1. Record vote
  await voteOnDecision(decisionId, optionId, 1);

  // 2. Complete decision
  await completeDecision(decisionId, optionId);

  // 3. Move to history
  // (handled by status change)
}
```

### Poll Mode (Multi-Round)
```typescript
async function handlePollVote(decision: PollDecision, optionId: string) {
  const { id, current_round } = decision;

  // 1. Record vote for current round
  await voteOnDecision(id, optionId, current_round);

  // 2. Check if both partners voted
  const roundComplete = await checkRoundComplete(id, current_round);

  if (!roundComplete) {
    // Show "waiting for partner" state
    return;
  }

  // 3. Both voted, calculate results
  if (current_round < 3) {
    // Calculate eliminations
    await calculateEliminations(id, current_round);

    // Progress to next round
    await progressToNextRound(id);
  } else {
    // Round 3 complete - finalize decision
    const winningOption = await getWinningOption(id);
    await completeDecision(id, winningOption.id);
  }
}
```

### Round Progression Logic
```typescript
async function calculateEliminations(decisionId: string, round: Round) {
  // Get votes for this round
  const votes = await getVotesForRound(decisionId, round);

  // Count votes per option
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.option_id] = (acc[vote.option_id] || 0) + 1;
    return acc;
  }, {});

  // Sort by vote count
  const sortedOptions = Object.entries(voteCounts)
    .sort((a, b) => b[1] - a[1]);

  if (round === 1) {
    // Keep top 50%
    const keepCount = Math.ceil(sortedOptions.length / 2);
    const eliminated = sortedOptions.slice(keepCount);

    // Mark eliminated options
    for (const [optionId] of eliminated) {
      await markOptionEliminated(optionId, round);
    }
  } else if (round === 2) {
    // Keep top 2
    const eliminated = sortedOptions.slice(2);

    for (const [optionId] of eliminated) {
      await markOptionEliminated(optionId, round);
    }
  }
}
```

### Privacy Controls
```typescript
async function canSeeVotes(decisionId: string, userId: string, round: Round): Promise<boolean> {
  // User can see votes only if both partners have voted in this round
  const roundComplete = await checkRoundComplete(decisionId, round);
  return roundComplete;
}

async function getVisibleOptions(decision: PollDecision, userId: string): Promise<DecisionOption[]> {
  const { current_round, options } = decision;

  // Filter out eliminated options
  return options.filter(opt =>
    !opt.eliminated_in_round || opt.eliminated_in_round >= current_round
  );
}
```

## Real-time Updates

### Supabase Subscriptions
```typescript
// Subscribe to decision changes
const subscription = supabase
  .channel('decisions')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'decisions',
      filter: `couple_id=eq.${coupleId}`
    },
    (payload) => {
      // Update local state with new decision
      handleDecisionUpdate(payload.new);
    }
  )
  .subscribe();

// Subscribe to vote changes
const voteSubscription = supabase
  .channel('votes')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'votes',
      filter: `decision_id=eq.${decisionId}`
    },
    (payload) => {
      // Check if round complete
      checkAndProgressRound(decisionId);
    }
  )
  .subscribe();
```

## UI State Management

### Decision Queue State
```typescript
const [decisions, setDecisions] = useState<Decision[]>([]);
const [loading, setLoading] = useState(true);

// Load decisions
useEffect(() => {
  async function loadDecisions() {
    const data = await decisionService.getDecisions(coupleId);
    setDecisions(data);
    setLoading(false);
  }
  loadDecisions();

  // Subscribe to updates
  const sub = decisionService.subscribeToDecisions(coupleId, (updated) => {
    setDecisions(prev =>
      prev.map(d => d.id === updated.id ? updated : d)
    );
  });

  return () => sub.unsubscribe();
}, [coupleId]);
```

### Optimistic Updates
```typescript
async function handleVoteOptimistic(decisionId: string, optionId: string) {
  // 1. Update UI immediately
  setDecisions(prev => prev.map(d =>
    d.id === decisionId
      ? { ...d, options: d.options.map(opt => ({
          ...opt,
          selected: opt.id === optionId
        }))}
      : d
  ));

  // 2. Send to backend
  try {
    await voteOnDecision(decisionId, optionId, currentRound);
  } catch (error) {
    // Revert on error
    loadDecisions();
  }
}
```

## Testing Checklist

### Decision Creation
- [ ] Create vote decision with options
- [ ] Create poll decision with options
- [ ] Create decision from option list
- [ ] Create decision with custom options
- [ ] Validate required fields

### Voting - Vote Mode
- [ ] Vote on decision
- [ ] See decision marked complete
- [ ] Partner sees completion
- [ ] Decision moves to history

### Voting - Poll Mode
- [ ] Round 1: Both partners vote privately
- [ ] Votes hidden until both complete
- [ ] Progress to Round 2 with top 50%
- [ ] Round 2: Both partners vote
- [ ] Progress to Round 3 with top 2
- [ ] Round 3: Only partner can vote
- [ ] Creator blocked from Round 3
- [ ] Final decision recorded
- [ ] Decision moves to history

### Real-time Updates
- [ ] Partner creates decision → appears in queue
- [ ] Partner votes → UI updates
- [ ] Round progression → both partners see update
- [ ] Decision completion → both partners updated

### Option Lists
- [ ] Create option list
- [ ] Edit option list inline
- [ ] Delete option list
- [ ] Use list in decision creation
- [ ] Lists shared between partners

## Performance Considerations

### Database Indexes
```sql
-- Critical indexes for performance
CREATE INDEX idx_decisions_couple_id ON decisions(couple_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_votes_decision_id ON votes(decision_id);
CREATE INDEX idx_votes_user_round ON votes(user_id, round);
CREATE INDEX idx_decision_options_decision_id ON decision_options(decision_id);
```

### Query Optimization
- Use pagination for history (limit 20, load more)
- Cache option lists locally
- Debounce real-time updates (300ms)
- Prefetch partner's profile data

### Bundle Size
- Lazy load history page
- Code split by route
- Optimize icon imports
- Tree-shake unused utilities

## Deployment Checklist

### Environment Setup
- [ ] Supabase project configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] RLS policies enabled
- [ ] Storage buckets created (if needed)

### Pre-launch
- [ ] Test with real couple accounts
- [ ] Verify real-time updates
- [ ] Test offline scenarios
- [ ] Security audit on RLS
- [ ] Performance testing

### Monitoring
- [ ] Error tracking setup
- [ ] Analytics integration
- [ ] Performance monitoring
- [ ] User feedback collection
