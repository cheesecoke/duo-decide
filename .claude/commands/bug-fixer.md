# Bug Fixer Agent

Fix identified bugs with minimal, focused changes in the Duo app.

## Instructions

1. Locate the relevant code based on the bug description
2. Understand the root cause completely before making changes
3. Create a minimal fix that:
   - Doesn't break other functionality
   - Follows existing code patterns in the file
   - Includes appropriate error handling
   - Adds defensive checks where needed

## Fix Process

### Step 1: Reproduce Understanding
```
1. Read the file containing the bug
2. Trace the code path that triggers the bug
3. Identify the exact line(s) causing the issue
4. Understand why the current code fails
```

### Step 2: Design the Fix
```
1. Determine the minimal change needed
2. Check if fix affects other callers of the function
3. Consider if the fix needs to be applied elsewhere
4. Plan any defensive checks needed
```

### Step 3: Implement
```
1. Make the code change
2. Add/update error handling if needed
3. Update types if necessary
4. Do NOT add unnecessary changes
```

## Output Format

Provide:
1. **Root Cause**: Why the bug occurs
2. **Fix**: The code change (minimal diff)
3. **Verification**: How to confirm the fix works
4. **Regression Test**: Test case to add

## Fix Patterns

### Pattern 1: Missing Null Check
**Before:**
```typescript
const userName = profile.display_name;
```

**After:**
```typescript
const userName = profile?.display_name || profile?.email?.split("@")[0] || "Unknown";
```

### Pattern 2: Race Condition Prevention
**Before:**
```typescript
const vote = await recordVote(decisionId, optionId);
const isComplete = await checkCompletion(decisionId);
```

**After:**
```typescript
const vote = await recordVote(decisionId, optionId);
// Re-fetch to get latest state after our write
const freshDecision = await getDecisionById(decisionId);
const isComplete = await checkCompletion(decisionId, freshDecision.data);
```

### Pattern 3: Missing Error Propagation
**Before:**
```typescript
const result = await someOperation();
doSomethingWith(result.data);
```

**After:**
```typescript
const result = await someOperation();
if (result.error) {
  setError(result.error);
  return;
}
doSomethingWith(result.data);
```

### Pattern 4: Stale Closure Fix
**Before:**
```typescript
useEffect(() => {
  const subscription = subscribe((data) => {
    setItems([...items, data]); // `items` is stale!
  });
}, []); // Missing dependency
```

**After:**
```typescript
useEffect(() => {
  const subscription = subscribe((data) => {
    setItems((prev) => [...prev, data]); // Use functional update
  });
}, []); // No dependency needed with functional update
```

## Rules

1. **Minimal Changes Only**: Don't refactor unrelated code
2. **Match Existing Style**: Follow patterns already in the file
3. **No New Dependencies**: Unless absolutely necessary
4. **Document Why**: Add comments for non-obvious fixes
5. **Test Backward Compatibility**: Ensure existing callers still work

## Common Fixes in This Codebase

### Vote Recording
Location: `lib/database.ts:recordVote()`
Common issues:
- Vote not updating if already exists
- Round parameter not passed correctly
- Error not returned to caller

### Round Progression
Location: `lib/database.ts:progressToNextRound()`
Common issues:
- Options not filtered correctly for next round
- Round counter off by one
- Decision status not updated

### Poll Voting
Location: `hooks/decision-queue/useDecisionVoting.ts:handlePollVote()`
Common issues:
- Creator allowed to vote in Round 3
- Poll votes not cleared between rounds
- Status not updated after round completion
