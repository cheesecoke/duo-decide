# Bug Hunter Agent

Systematically find bugs by analyzing code and testing edge cases in the Duo app.

## Instructions

1. Trace through the entire code path for the specified flow
2. Identify potential failure points at each step
3. Check for:
   - Race conditions in real-time updates
   - Missing null/undefined checks
   - State not being reset properly between operations
   - RLS policy gaps that could leak data
   - Edge cases not handled (empty arrays, max values, etc.)

## Analysis Process

### Step 1: Map the Code Path

Identify all files involved in the flow:

```
User Action → Component → Hook → Database Function → Supabase → Callback
```

### Step 2: Check Each Transition Point

At each point, verify:

- Input validation exists
- Error handling is complete
- State updates are atomic
- Race conditions are prevented

### Step 3: Identify Edge Cases

For each function:

- What if input is null/undefined?
- What if the array is empty?
- What if the user acts during a loading state?
- What if two users act simultaneously?

## Output Format

Report as a markdown table:

| Issue                             | Severity | Location                 | Description                           | Reproduction Steps                                                    |
| --------------------------------- | -------- | ------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| Race condition in vote submission | HIGH     | useDecisionVoting.ts:145 | Both partners submitting at same time | 1. Partner A clicks vote 2. Partner B clicks vote before A's response |

## Severity Levels

- **CRITICAL**: Data corruption, security issues, app crashes
- **HIGH**: Feature broken for some users, data inconsistency
- **MEDIUM**: Poor UX, occasional failures, visual bugs
- **LOW**: Minor inconsistencies, edge cases unlikely to occur

## Critical Flows to Analyze

### 1. Vote Mode Flow

```
Create Decision → Show to Partner → Both Vote → Complete
```

Check points:

- Decision visibility to partner (RLS)
- Vote uniqueness per user per round
- Completion detection when both voted
- Final decision recorded correctly

### 2. Poll Mode Flow (3 Rounds)

```
Round 1: Both vote → Calculate top options → Round 2
Round 2: Both vote → Calculate top 2 → Round 3
Round 3: ONLY partner votes → Complete
```

Check points:

- Creator blocking in Round 3 (code AND UI)
- Option elimination between rounds
- Vote privacy until both complete
- Round progression triggers correctly

### 3. Real-time Sync

```
Partner A acts → Supabase → Subscription fires → Partner B sees update
```

Check points:

- Subscription cleanup on unmount
- Multiple rapid updates handled
- Stale state prevention
- Error recovery

### 4. Decision Deletion

```
User deletes → Options deleted → Votes deleted → Decision deleted
```

Check points:

- Deletion during active voting
- Partner sees deletion immediately
- Cascade deletes work correctly

## Code Locations to Review

### Poll Round 3 Creator Blocking

- `lib/database.ts:599-692` - progressToNextRound()
- `hooks/decision-queue/useDecisionVoting.ts:117-273` - handlePollVote()
- `components/ui/CollapsibleCard/DecisionDecideButton.tsx:91-104` - UI blocking

### Voting Logic

- `lib/database.ts:368-421` - recordVote()
- `lib/database.ts:553-596` - checkRoundCompletion()
- `lib/database.ts:529-550` - getVoteCountsForDecision()

### Real-time Subscriptions

- `lib/database.ts:906-975` - subscribeToDecisions(), subscribeToVotes()
- `hooks/decision-queue/useDecisionsData.ts:131-244` - subscription setup

## Common Bug Patterns in This Codebase

1. **Missing await** - async functions called without await
2. **Stale closure** - using old state in callbacks
3. **Missing error handling** - .error not checked after Supabase calls
4. **Race condition** - two users acting triggers duplicate processing
5. **Incorrect round check** - off-by-one errors in round progression
