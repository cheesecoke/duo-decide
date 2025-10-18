# Duo - Poll Round Logic Documentation

> **Purpose**: Complete reference for poll voting rounds, including backend logic, frontend UI states, data flow, and couple interaction patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Decision Types](#decision-types)
3. [Poll Round Flow](#poll-round-flow)
4. [Database Schema](#database-schema)
5. [Backend Logic](#backend-logic)
6. [Frontend UI States](#frontend-ui-states)
7. [Data Flow Between Partners](#data-flow-between-partners)
8. [Component Behavior](#component-behavior)
9. [Privacy Controls](#privacy-controls)
10. [Error Handling](#error-handling)
11. [Testing Scenarios](#testing-scenarios)

---

## Overview

Duo supports two decision-making modes:

1. **Vote Mode**: Simple single-round voting where both partners select one option and the decision completes
2. **Poll Mode**: Multi-round progressive elimination system (Rounds 1-3) designed to reduce decision paralysis

This document focuses primarily on **Poll Mode** as it's the more complex of the two systems.

---

## Decision Types

### Vote Mode

**Behavior:**

- Single round voting
- Both partners select one option from the full list
- Decision completes when both partners vote
- No option elimination
- No round progression

**Database Fields:**

```typescript
{
  type: "vote",
  current_round: 1,
  status: "pending" | "voted" | "completed"
}
```

**UI States:**

- **Pending**: Neither partner has voted
- **Voted**: One partner has voted (shows "Waiting for partner")
- **Completed**: Both partners voted, decision finalized

### Poll Mode

**Behavior:**

- Three-round progressive elimination
- Vote privacy between rounds
- Creator blocking in Round 3
- Top 50% → Top 2 → Final decision

**Database Fields:**

```typescript
{
  type: "poll",
  current_round: 1 | 2 | 3,
  status: "pending" | "voted" | "completed"
}
```

**Round Progression:**

- **Round 1 → Round 2**: Keep top 50% of options by vote count
- **Round 2 → Round 3**: Keep top 2 options by vote count
- **Round 3**: Only partner votes (creator blocked)

---

## Poll Round Flow

### Round 1: Initial Voting

**Options Visible**: All options (100%)
**Who Can Vote**: Both partners
**Privacy**: Votes hidden from partner until both complete round
**Completion Criteria**: Both partners have voted

**User Experience:**

1. User sees all options
2. Selects one option
3. Clicks "Submit Vote" button
4. Vote recorded in database
5. UI shows "Waiting for partner..." message
6. Once partner votes, Round 2 begins automatically

**Backend Actions on Completion:**

1. Check both partners have voted (`checkRoundCompletion`)
2. Count votes for each option (`getVoteCountsForDecision`)
3. **Check for same option votes**: If both partners voted for the same option → Decision complete
4. **If different options voted**: Sort options by vote count and keep top 50% (round up if odd number)
5. Mark eliminated options with `eliminated_in_round: 1`
6. Update decision: `current_round: 2`
7. Real-time update sent to both clients

### Round 2: Narrowing Down

**Options Visible**: Top 50% from Round 1
**Who Can Vote**: Both partners
**Privacy**: Votes hidden from partner until both complete round
**Completion Criteria**: Both partners have voted

**User Experience:**

1. User sees reduced option set (eliminated options hidden)
2. Selects one option from remaining choices
3. Clicks "Submit Vote" button
4. Vote recorded in database (round: 2)
5. UI shows "Waiting for partner..." message
6. Once partner votes, Round 3 begins automatically

**Backend Actions on Completion:**

1. Check both partners have voted for Round 2
2. Count votes for each remaining option
3. **Check for same option votes**: If both partners voted for the same option → Decision complete
4. **If different options voted**: Sort options by vote count and keep top 2 options
5. Mark eliminated options with `eliminated_in_round: 2`
6. Update decision: `current_round: 3`
7. Real-time update sent to both clients

### Round 3: Final Decision (Creator Blocked)

**Options Visible**: Top 2 options
**Who Can Vote**: ONLY the partner (NOT the creator)
**Privacy**: N/A (only one person voting)
**Completion Criteria**: Partner has voted

**User Experience (Partner):**

1. Partner sees final 2 options
2. Selects one option
3. Clicks "Submit Vote" button
4. Vote recorded in database (round: 3)
5. Decision completes immediately
6. Both users see final decision

**User Experience (Creator):**

1. Creator sees final 2 options but CANNOT vote
2. UI shows "Waiting for [Partner Name] to make final decision..." message
3. "Submit Vote" button is disabled/hidden
4. Once partner votes, both users see final decision

**Backend Actions on Completion:**

1. Record partner's vote (round: 3)
2. Update decision:
   ```typescript
   {
     status: "completed",
     decided_by: partnerId,
     decided_at: timestamp,
     final_decision: selectedOptionId
   }
   ```
3. Real-time update sent to both clients
4. Decision moves to history

---

## Database Schema

### decisions Table

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  partner_id UUID NOT NULL REFERENCES profiles(id),
  couple_id UUID NOT NULL REFERENCES couples(id),
  type TEXT NOT NULL CHECK (type IN ('vote', 'poll')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'voted', 'completed')),
  current_round INTEGER NOT NULL DEFAULT 1,
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMP WITH TIME ZONE,
  final_decision UUID REFERENCES decision_options(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields for Polls:**

- `type`: 'poll' for multi-round voting
- `current_round`: 1, 2, or 3 (tracks progression)
- `status`: 'pending' → 'voted' → 'completed'
- `decided_by`: User ID of who made final decision (Round 3 partner)
- `final_decision`: Option ID that won

### decision_options Table

```sql
CREATE TABLE decision_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  eliminated_in_round INTEGER, -- NULL if active, 1-3 if eliminated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields for Polls:**

- `eliminated_in_round`: Tracks when option was eliminated
  - `NULL`: Option still active
  - `1`: Eliminated after Round 1
  - `2`: Eliminated after Round 2
  - Never `3` (Round 3 only has 2 options, one becomes final_decision)

### votes Table

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  option_id UUID NOT NULL REFERENCES decision_options(id),
  round INTEGER NOT NULL, -- 1, 2, or 3
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(decision_id, user_id, round) -- One vote per user per round
);
```

**Key Fields for Polls:**

- `round`: Which round this vote belongs to (1, 2, or 3)
- `UNIQUE` constraint ensures users can't vote twice in same round
- Users vote once per round (can have 3 total votes for a poll)

---

## Backend Logic

### Core Functions (database.ts)

#### 1. recordVote()

**Purpose**: Record or update a user's vote for a specific round

**Signature:**

```typescript
recordVote(
  decisionId: string,
  optionId: string,
  userId: string,
  round: number = 1
): Promise<DatabaseResult<Vote>>
```

**Logic:**

1. Check if vote already exists for this user/decision/round
2. If exists: UPDATE the vote (change optionId)
3. If not exists: INSERT new vote
4. Return vote record

**Used For:**

- All voting in both Vote and Poll modes
- Prevents duplicate vote errors (409 Conflict)
- Allows users to change their vote before round completes

#### 2. getVotesForRound()

**Purpose**: Get all votes for a specific round

**Signature:**

```typescript
getVotesForRound(
  decisionId: string,
  round: number
): Promise<DatabaseListResult<Vote>>
```

**Logic:**

1. Query votes table
2. Filter by decision_id AND round
3. Return array of votes

**Used For:**

- Checking round completion
- Counting votes
- Determining winners

#### 3. getUserVoteForDecision()

**Purpose**: Get a specific user's vote for a round

**Signature:**

```typescript
getUserVoteForDecision(
  decisionId: string,
  userId: string,
  round: number = 1
): Promise<DatabaseResult<Vote>>
```

**Logic:**

1. Query votes table
2. Filter by decision_id AND user_id AND round
3. Return single vote or null

**Used For:**

- Loading existing vote on page load
- Marking option as "selected" in UI
- Checking if user has voted

#### 4. getVoteCountsForDecision()

**Purpose**: Calculate vote counts for all options in a round

**Signature:**

```typescript
getVoteCountsForDecision(
  decisionId: string,
  round: number
): Promise<DatabaseResult<Record<string, number>>>
```

**Logic:**

1. Get all votes for the round
2. Count votes per option_id
3. Return map: `{ optionId: voteCount }`

**Used For:**

- Determining which options to keep/eliminate
- Showing vote counts (if privacy allows)
- Sorting options by popularity

#### 5. checkRoundCompletion()

**Purpose**: Check if both partners have voted in current round

**Signature:**

```typescript
checkRoundCompletion(
  decisionId: string,
  round: number,
  coupleId: string
): Promise<DatabaseResult<boolean>>
```

**Logic:**

1. Get both user IDs from couple
2. Get all votes for this round
3. Check if both user IDs are in voter set
4. Return true if both voted, false otherwise

**Used For:**

- Determining when to progress to next round
- Showing "Waiting for partner" message
- Triggering round progression

#### 6. progressToNextRound()

**Purpose**: Move poll from current round to next round

**Signature:**

```typescript
progressToNextRound(
  decisionId: string,
  currentRound: number
): Promise<DatabaseResult<boolean>>
```

**Logic:**

1. Get decision with options
2. Get vote counts for current round
3. Get active options (not eliminated)
4. Sort options by vote count (descending)
5. **If Round 1:**
   - Keep top 50% (Math.ceil to round up)
   - Eliminate bottom 50%
6. **If Round 2:**
   - Keep top 2 options
   - Eliminate rest
7. Update eliminated options: `eliminated_in_round = currentRound`
8. Update decision: `current_round = currentRound + 1`
9. Return success

**Used For:**

- Automatic progression after both partners vote
- Called by backend after vote submission
- Triggers real-time updates

#### 7. completeDecision()

**Purpose**: Mark decision as completed with final choice

**Signature:**

```typescript
completeDecision(
  decisionId: string,
  finalOptionId: string,
  decidedBy: string
): Promise<DatabaseResult<DecisionWithOptions>>
```

**Logic:**

1. Update decision:
   ```typescript
   {
     status: "completed",
     decided_by: decidedBy,
     decided_at: new Date().toISOString(),
     final_decision: finalOptionId
   }
   ```
2. Return updated decision

**Used For:**

- Completing polls after Round 3 vote
- Completing votes after both partners vote
- Moving decision to history

---

## Frontend UI States

### Decision Card States

#### Pending (No Votes Yet)

**Visual Indicators:**

- Status badge: "Pending"
- Round indicator: "Round 1/3" (polls only)
- All options visible
- All options unselected
- "Submit Vote" button: Enabled

**User Actions:**

- Can select any option
- Can submit vote

#### Voted (User Has Voted, Waiting for Partner)

**Visual Indicators:**

- Status badge: "Voted"
- User's selected option: Highlighted/checked
- Other options: Visible but grayed out
- Message: "Waiting for [Partner Name] to vote..."
- "Submit Vote" button: Disabled or hidden

**User Actions:**

- Can view their selection
- Cannot change vote (or can change before partner votes - TBD)
- Must wait for partner

#### Round Complete (Both Voted, Processing)

**Visual Indicators:**

- Status badge: "Processing" or loading state
- Brief transition state
- Options may be hidden during processing

**Backend Actions:**

- `checkRoundCompletion()` returns true
- `progressToNextRound()` executes
- Real-time update sent

**Duration**: Milliseconds to 1-2 seconds

#### Round 2/3 Active

**Visual Indicators:**

- Round indicator: "Round 2/3" or "Round 3/3"
- Only active options visible (eliminated options hidden)
- Status badge: "Pending" (for new round)
- All active options unselected (fresh vote)
- "Submit Vote" button: Enabled

**User Actions:**

- Select from remaining options
- Submit new vote

#### Round 3 (Creator View) - BLOCKED

**Visual Indicators:**

- Round indicator: "Round 3/3 - Final Decision"
- Top 2 options visible
- Message: "Waiting for [Partner Name] to make final decision..."
- "Submit Vote" button: Hidden or disabled with message
- Optional: Explanation badge "Creator cannot vote in final round"

**User Actions:**

- Can only view options
- Cannot vote
- Must wait for partner

**Rationale**: Prevents creator bias in final decision

#### Completed

**Visual Indicators:**

- Status badge: "Completed"
- Final option: Highlighted with checkmark
- Decided by: "Decided by [Name]"
- Decided at: Timestamp
- All other options: Grayed out or hidden
- No voting controls visible

**User Actions:**

- View final decision
- Option to view decision in history
- Cannot change vote

---

## Component Behavior

### CollapsibleCard Component

**Props Related to Polls:**

```typescript
{
  mode: "vote" | "poll",
  currentRound: 1 | 2 | 3,
  status: "pending" | "voted" | "completed",
  options: Array<{ id, title, selected, eliminated }>,
  userName: string,
  partnerName: string,
  createdBy: string, // Who created the decision
  pollVotes: Record<string, number>, // Vote counts per option
  loading: boolean,
  onPollVote: (optionId: string) => void,
  onDecide: () => void // Submit poll vote
}
```

**Rendering Logic:**

```typescript
// Show round indicator for polls
{mode === "poll" && (
  <RoundIndicator>
    Round {currentRound}/3
    {currentRound === 3 && <FinalRoundBadge />}
  </RoundIndicator>
)}

// Filter options by elimination status
const activeOptions = options.filter(
  opt => !opt.eliminated_in_round || opt.eliminated_in_round >= currentRound
);

// Creator blocking in Round 3
const isCreator = createdBy === userName;
const isRound3 = currentRound === 3;
const canVote = !(mode === "poll" && isRound3 && isCreator);

// Show appropriate message
{!canVote && (
  <BlockedMessage>
    Waiting for {partnerName} to make final decision...
  </BlockedMessage>
)}

// Submit button state
<DecideButton
  disabled={loading || !canVote || !hasSelection}
  onPress={mode === "poll" ? onDecide : () => onDecide(selectedOptionId)}
>
  {loading ? "Submitting..." : "Submit Vote"}
</DecideButton>
```

### OptionsDisplay Component

**Props:**

```typescript
{
  options: Array<{ id, title, selected }>,
  onOptionPress: (optionId: string) => void,
  mode: "vote" | "poll",
  disabled: boolean,
  radioColor: string
}
```

**Behavior:**

- Radio button selection (single choice)
- Disabled state when user has voted
- Visual feedback on selection
- Supports both vote and poll modes

### DecisionStatusBadge Component

**Status Mapping:**

```typescript
const statusConfig = {
	pending: { text: "Pending", color: "muted" },
	voted: { text: "Voted", color: "yellow" },
	completed: { text: "Completed", color: "success" },
};
```

**Additional Poll Badges:**

```typescript
// Round indicator
<Badge color="round1" | "round2" | "round3">
  Round {currentRound}/3
</Badge>

// Final round indicator
{currentRound === 3 && (
  <Badge color="round3">Final Round</Badge>
)}
```

### VotingStatusIndicator Component

**States:**

```typescript
{
	status === "pending" && "Select an option to vote";
}
{
	status === "voted" && `Waiting for ${partnerName} to vote...`;
}
{
	mode === "poll" &&
		currentRound === 3 &&
		isCreator &&
		`Waiting for ${partnerName} to make final decision...`;
}
{
	status === "completed" && `Decided by ${decidedBy}`;
}
```

### UI Color Consistency for Polls

**CRITICAL RULE**: All UI elements for a poll must match the current round's color scheme.

**Round Colors (Exact Values):**

- **Round 1**: `rgba(255, 185, 198, 1)` - Salmon Pink (`round1`)
- **Round 2**: `rgba(170, 211, 255, 1)` - Baby Blue (`round2`)
- **Round 3**: `rgba(170, 147, 243, 1)` - Purple (`round3`)

**Action Colors:**

- **Primary**: `hsl(48, 96%, 53%)` - Yellow (`yellow`) - Used for CTAs, user flow indicators, primary actions
- **Success**: `rgba(76, 217, 100, 1)` - Green (`success`/`green`) - Used for checkmarks, completed states
- **Destructive**: `hsl(4, 66%, 30%)` - Dark Red (`destructive`) - Used for delete/trash icons

**Elements That Must Match Round Color:**

1. Round badge (top right)
2. Poll icon (next to title)
3. "Submit Vote" button background
4. "Waiting for partner" button text/icon (disabled state)
5. "Vote Submitted" button text/icon (disabled state)
6. Radio button selection color

**Implementation:**

```typescript
// Get round color
const roundColor = getPollColor(colorMode, currentRound);

// Apply to all poll UI elements
<SubmitButton backgroundColor={roundColor} />
<WaitingButton textColor={roundColor} disabled />
<RoundBadge backgroundColor={roundColor} />
<RadioButton checkedColor={roundColor} />

// Action colors
<PrimaryButton color={getColor("yellow", colorMode)} /> // Yellow CTA
<CheckIcon color={getColor("success", colorMode)} /> // Green checkmark
<TrashIcon color={getColor("destructive", colorMode)} /> // Red trash
```

**Color Usage Guidelines**:

- **Round Colors**: Use for all poll-related UI elements to maintain visual consistency
- **Primary Yellow**: Use for CTAs, user flow indicators, primary actions, pending states
- **Success Green**: Use for completed actions, checkmarks, positive feedback
- **Destructive Red**: Use for delete actions, warnings, destructive operations

**Why This Matters**:

- Visual consistency helps users understand which round they're in
- Color coding reduces confusion between rounds
- Disabled states maintain color scheme (just opacity/darkness changes)
- Creates cohesive, professional UX
- Clear visual hierarchy for different action types

---

## Data Flow Between Partners

### Initial Decision Creation

```
User1 (Creator)
  └─> Creates decision with options
       └─> POST /decisions
            └─> INSERT into decisions (type: "poll", current_round: 1)
            └─> INSERT into decision_options (multiple rows)
            └─> Real-time broadcast to couple_id
                 └─> User2 receives new decision
                      └─> Shows in their queue
```

### Round 1 Voting Flow

```
User1 Votes First:
  └─> Selects Option A
       └─> POST /votes
            └─> INSERT vote (decision_id, user1_id, option_a_id, round: 1)
            └─> checkRoundCompletion() → false (only 1/2 votes)
            └─> User1 UI: "Waiting for User2..."
            └─> Real-time broadcast: status: "voted"
                 └─> User2 sees "User1 has voted"

User2 Votes Second:
  └─> Selects Option B
       └─> POST /votes
            └─> INSERT vote (decision_id, user2_id, option_b_id, round: 1)
            └─> checkRoundCompletion() → true (2/2 votes)
            └─> progressToNextRound(decision_id, 1)
                 └─> Calculate vote counts
                 └─> Keep top 50%
                 └─> UPDATE decision_options (set eliminated_in_round: 1)
                 └─> UPDATE decisions (current_round: 2)
                 └─> Real-time broadcast: decision updated
                      └─> User1 UI: Shows Round 2 options
                      └─> User2 UI: Shows Round 2 options
```

### Round 2 Voting Flow

```
Similar to Round 1, but:
  - Only non-eliminated options visible
  - Vote records have round: 2
  - After completion: Keep top 2 options
  - Progress to Round 3
```

### Round 3 Voting Flow (Creator Blocked)

```
User1 (Creator) View:
  └─> Sees 2 final options
  └─> Cannot vote (blocked in UI)
  └─> Message: "Waiting for User2 to make final decision..."

User2 (Partner) Votes:
  └─> Selects final option
       └─> POST /votes
            └─> INSERT vote (decision_id, user2_id, final_option_id, round: 3)
            └─> completeDecision(decision_id, final_option_id, user2_id)
                 └─> UPDATE decisions:
                      {
                        status: "completed",
                        decided_by: user2_id,
                        decided_at: now,
                        final_decision: final_option_id
                      }
                 └─> Real-time broadcast: decision completed
                      └─> User1 UI: Shows completed decision
                      └─> User2 UI: Shows completed decision
                      └─> Both see final result
```

### Real-Time Subscription Pattern

```typescript
// Both users subscribe to couple's decisions
supabase
	.channel("decisions_changes")
	.on(
		"postgres_changes",
		{
			event: "*",
			schema: "public",
			table: "decisions",
			filter: `couple_id=eq.${coupleId}`,
		},
		(payload) => {
			// Handle INSERT, UPDATE, DELETE
			if (payload.eventType === "UPDATE") {
				// Decision updated (status, round, completion)
				refreshDecisionInUI(payload.new);
			}
		},
	)
	.subscribe();

// Subscribe to votes for real-time vote counts (if implementing)
supabase
	.channel("votes_changes")
	.on(
		"postgres_changes",
		{
			event: "*",
			schema: "public",
			table: "votes",
			filter: `decision_id=eq.${decisionId}`,
		},
		(payload) => {
			// Update vote counts in UI
			refreshVoteCounts(decisionId);
		},
	)
	.subscribe();
```

---

## Privacy Controls

### Vote Privacy Requirements

**Why Privacy Matters:**

- Prevents partner from influencing votes
- Reduces social pressure
- Encourages honest preferences
- Maintains fairness in decision-making

**Implementation:**

#### Round 1 & 2 Privacy

**Rule**: Votes are hidden until BOTH partners complete the round

**Backend:**

```typescript
// Only show vote counts after round completion
if (roundComplete) {
	const voteCounts = await getVoteCountsForDecision(decisionId, round);
	return voteCounts;
} else {
	// Return empty or null - no vote counts visible
	return {};
}
```

**Frontend:**

```typescript
// Don't show partner's selection
{status === "voted" && (
  <Message>Waiting for {partnerName} to vote...</Message>
  // Don't show which option partner selected
)}

// Don't show vote counts mid-round
{!roundComplete && (
  <Options hideVoteCounts={true} />
)}
```

#### Round 3 Transparency

**Rule**: Only partner votes, creator just waits

**Implementation:**

```typescript
const isCreator = createdBy === userName;
const canVote = !(mode === "poll" && currentRound === 3 && isCreator);

{!canVote && (
  <BlockedMessage>
    Waiting for {partnerName} to make final decision...
  </BlockedMessage>
)}
```

**No Privacy Needed**: Only one person voting, so no influence possible

### Decision Completion Logic

**CRITICAL RULE**: A decision can complete at ANY round if both partners vote for the same option.

**Completion Scenarios:**

1. **Round 1 Same Vote**: Both partners vote for the same option → Decision completes immediately
2. **Round 2 Same Vote**: Both partners vote for the same option → Decision completes immediately
3. **Round 3 Vote**: Partner votes for one of the final 2 options → Decision completes

**Implementation Logic:**

```typescript
// After both partners vote in any round
const voteCounts = await getVoteCountsForDecision(decisionId, currentRound);
const votedOptions = Object.keys(voteCounts).filter((optionId) => voteCounts[optionId] > 0);

if (votedOptions.length === 1) {
	// Both partners voted for the same option - decision complete!
	await completeDecision(decisionId, votedOptions[0], userId);
} else {
	// Different options voted - progress to next round
	await progressToNextRound(decisionId, currentRound);
}
```

**Why This Matters:**

- Prevents unnecessary rounds when partners already agree
- Reduces decision fatigue
- Provides immediate satisfaction when consensus is reached
- Maintains the elimination system for when partners disagree

---

## Error Handling

### Common Errors and Solutions

#### 1. 409 Conflict - Duplicate Vote

**Cause**: Trying to INSERT vote when one already exists

**Solution**:

```typescript
// Always check for existing vote first
const existingVote = await getUserVoteForDecision(decisionId, userId, round);
if (existingVote.data) {
	// UPDATE existing vote
	await updateVote(existingVote.data.id, newOptionId);
} else {
	// INSERT new vote
	await insertVote(decisionId, userId, optionId, round);
}
```

**User Experience**: Seamless - vote is updated, no error shown

#### 2. Vote Not Captured (Current Bug)

**Symptoms**: Console shows success but vote doesn't persist

**Potential Causes**:

1. Real-time subscription not firing
2. Round progression happening but not updating UI
3. Vote record created but not linked to decision
4. Frontend state not updating after vote

**Debugging Steps**:

```typescript
console.log("🚀 Recording vote:", { decisionId, optionId, userId, round });
const result = await recordVote(decisionId, optionId, userId, round);
console.log("✅ Vote result:", result);

// Check if vote was actually saved
const savedVote = await getUserVoteForDecision(decisionId, userId, round);
console.log("🔍 Saved vote:", savedVote);

// Check round completion
const roundComplete = await checkRoundCompletion(decisionId, round, coupleId);
console.log("🔍 Round complete:", roundComplete);
```

#### 3. Creator Voting in Round 3

**Prevention**: Frontend blocks UI

**Backend Validation** (should add):

```typescript
// In recordVote() for Round 3
if (round === 3) {
	const decision = await getDecisionById(decisionId);
	if (userId === decision.creator_id) {
		throw new Error("Creator cannot vote in Round 3");
	}
}
```

#### 4. Round Progression Without Both Votes

**Prevention**: `checkRoundCompletion()` must return true

**Validation**:

```typescript
const roundComplete = await checkRoundCompletion(decisionId, round, coupleId);
if (!roundComplete) {
	// Don't progress - wait for both votes
	return { error: "Waiting for both partners to vote" };
}
```

---

## Testing Scenarios

### Manual Testing Checklist

#### Vote Mode Testing

**Test 1: Basic Vote Flow**

1. User1 creates vote decision with 3 options
2. User1 selects Option A, submits
3. Verify: User1 sees "Waiting for partner"
4. User2 sees decision, selects Option B, submits
5. Verify: Both see "Completed" status
6. Verify: Decision shows decided_by and decided_at

**Test 2: Simultaneous Voting**

1. User1 and User2 open same decision
2. Both select different options at same time
3. Both click submit simultaneously
4. Verify: No 409 errors
5. Verify: Both votes recorded
6. Verify: Decision completes properly

**Test 3: Vote Change**

1. User1 votes for Option A
2. Before User2 votes, User1 changes to Option B
3. Verify: Vote updates successfully
4. User2 votes
5. Verify: Decision completes with User1's updated vote

#### Poll Mode Testing

**Test 4: Round 1 → Round 2 Progression**

1. User1 creates poll with 6 options
2. User1 votes for Option A in Round 1
3. Verify: User1 sees "Waiting for partner"
4. User2 votes for Option B in Round 1
5. Verify: Both see Round 2 with top 3 options
6. Verify: Bottom 3 options marked eliminated_in_round: 1
7. Verify: current_round updated to 2

**Test 5: Round 2 → Round 3 Progression**

1. Continuing from Test 4
2. User1 votes in Round 2
3. User2 votes in Round 2
4. Verify: Both see Round 3 with top 2 options
5. Verify: eliminated options marked eliminated_in_round: 2
6. Verify: current_round updated to 3

**Test 6: Round 3 Creator Blocking**

1. Continuing from Test 5
2. User1 (creator) sees Round 3
3. Verify: User1 cannot vote (button disabled)
4. Verify: Message shows "Waiting for User2..."
5. User2 (partner) sees Round 3
6. Verify: User2 CAN vote
7. User2 votes
8. Verify: Decision completes immediately
9. Verify: decided_by is User2
10. Verify: Both see final result

**Test 7: Privacy Controls**

1. User1 votes in Round 1
2. User2 viewing decision
3. Verify: User2 cannot see which option User1 selected
4. Verify: No vote counts visible until both vote
5. Both complete Round 1
6. Verify: Round 2 begins (privacy maintained)

**Test 8: Real-Time Updates**

1. User1 and User2 both viewing decision queue
2. User1 creates new poll
3. Verify: User2 sees new poll appear immediately
4. User1 votes in Round 1
5. Verify: User2 sees status change to "voted"
6. User2 votes in Round 1
7. Verify: Both see Round 2 options appear
8. Verify: No page refresh needed

**Test 9: Error Recovery**

1. User1 votes, network disconnects
2. Network reconnects
3. Verify: Vote was saved
4. Verify: UI state matches database
5. User1 tries to vote again
6. Verify: Vote updates instead of error

**Test 10: Option Elimination Edge Cases**

1. Create poll with 3 options (odd number)
2. Round 1: All options get different vote counts
3. Verify: Math.ceil(3/2) = 2 options kept
4. Round 2: 2 options → both go to Round 3
5. Verify: No options eliminated in Round 2

---

## Current Known Issues

### Bug 1: Second User Vote Not Captured

**Status**: 🐛 Active Bug

**Symptoms**:

- Second user submits vote
- Console logs show success
- Decision stays in Round 1
- Vote not visible in database
- No round progression occurs

**Expected Behavior**:

- Second vote should be saved
- Round should progress to Round 2
- Both users should see updated options

**Investigation Needed**:

1. Check if vote INSERT/UPDATE succeeds
2. Check if `checkRoundCompletion()` is called
3. Check if `progressToNextRound()` is called
4. Check if real-time update fires
5. Check frontend state update logic

**Next Steps**:

- Add detailed logging to vote flow
- Test with two separate browsers
- Check database directly after vote
- Verify RLS policies aren't blocking
- Check for async timing issues

---

## Future Enhancements

### Potential Improvements

1. **Vote Change Window**: Allow users to change vote before partner votes
2. **Vote Counts Display**: Show vote distribution after round completes
3. **Animations**: Smooth transitions between rounds
4. **Undo Completion**: Admin ability to reopen completed decisions
5. **Custom Round Rules**: Allow couples to customize elimination percentages
6. **Tie Breaking**: Automatic or manual tie-breaker logic
7. **Vote Comments**: Allow users to add notes with their votes
8. **Decision Templates**: Save poll configurations for reuse

---

## Appendix: Quick Reference

### Status Transitions

```
Vote Mode:
pending → voted (1 vote) → completed (2 votes)

Poll Mode:
pending (R1) → voted (1 vote R1) → pending (R2, both voted R1)
→ voted (1 vote R2) → pending (R3, both voted R2)
→ voted (partner votes R3) → completed
```

### Round Progression Rules

```
Round 1: All options → Top 50%
Round 2: Top 50% → Top 2
Round 3: Top 2 → Winner (partner only)
```

### Database Query Examples

```sql
-- Get active options for current round
SELECT * FROM decision_options
WHERE decision_id = $1
  AND (eliminated_in_round IS NULL OR eliminated_in_round >= $2);

-- Get votes for specific round
SELECT * FROM votes
WHERE decision_id = $1 AND round = $2;

-- Check if both partners voted
SELECT COUNT(DISTINCT user_id) FROM votes
WHERE decision_id = $1 AND round = $2;

-- Get vote counts per option
SELECT option_id, COUNT(*) as vote_count
FROM votes
WHERE decision_id = $1 AND round = $2
GROUP BY option_id
ORDER BY vote_count DESC;
```

---

## Document Maintenance

**Last Updated**: 2025-10-18
**Version**: 1.0
**Maintainer**: Development Team

**Update Triggers**:

- When round logic changes
- When new features added
- When bugs fixed
- After testing reveals edge cases

**Related Documents**:

- `IMPLEMENTATION.md`: Technical architecture
- `TODO.md`: Current tasks and bugs
- `CLAUDE.md`: Project context
- Database migrations in `supabase/migrations/`
