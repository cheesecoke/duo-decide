# Test Writer Agent

Write Jest tests for the specified file in the Duo app codebase.

## Instructions

1. Read the source file completely to understand its functionality
2. Identify all exported functions/components
3. Write comprehensive tests covering:
   - Happy path scenarios (normal operation)
   - Error conditions (failures, edge cases)
   - Boundary conditions (null values, empty arrays, etc.)

## Supabase Mock Pattern

Use the mock from `test-utils/supabase-mock.ts`:

```typescript
import {
	resetMockData,
	setMockVotes,
	setMockDecisions,
	setMockDecisionOptions,
	setMockCouples,
	setMockProfiles,
	getMockVotes,
} from "@/test-utils/supabase-mock";

// In beforeEach:
beforeEach(() => {
	resetMockData();
	// Set up test data
	setMockCouples([mockCouple]);
	setMockProfiles(mockProfiles);
});
```

## Test Fixtures

Use fixtures from `test-utils/fixtures.ts`:

```typescript
import {
	USER_1_ID,
	USER_2_ID,
	COUPLE_ID,
	mockProfiles,
	mockCouple,
	user1Context,
	user2Context,
	mockVoteDecision,
	mockPollDecision,
	mockVoteOptions,
	mockPollOptions,
	createVote,
} from "@/test-utils/fixtures";
```

## Output

Complete test file with:

- All necessary imports
- Mock setup in beforeEach
- Organized describe blocks for each function
- Test cases following AAA pattern (Arrange, Act, Assert)

## Key Files to Test

Priority order:

1. `lib/database.ts` - Vote recording, round progression, completion logic
2. `hooks/decision-queue/useDecisionVoting.ts` - Core voting logic
3. `hooks/decision-queue/useDecisionsData.ts` - Data loading and subscriptions

## Critical Test Cases

### For lib/database.ts:

- `recordVote()` - creates vote, updates existing vote, handles errors
- `checkRoundCompletion()` - Round 1/2 needs 2 votes, Round 3 needs 1 vote
- `progressToNextRound()` - eliminates options, advances round
- `completeDecision()` - marks decision complete with final choice

### For useDecisionVoting:

- `handleVote()` - records vote, completes when both voted
- `handlePollVote()` - handles 3-round progression, creator blocking in Round 3

### Example Test Structure

```typescript
describe("recordVote", () => {
	describe("when creating a new vote", () => {
		it("should create a vote record with correct data", async () => {
			// Arrange
			resetMockData();
			setMockDecisions([mockVoteDecision]);

			// Act
			const result = await recordVote(mockVoteDecision.id, OPTION_1_ID, USER_1_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toMatchObject({
				decision_id: mockVoteDecision.id,
				option_id: OPTION_1_ID,
				user_id: USER_1_ID,
				round: 1,
			});
		});
	});
});
```
