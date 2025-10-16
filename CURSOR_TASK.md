# CURSOR TASK: Complete Supabase Migration & Fix Voting System

## CONTEXT
The Duo app is currently in a **half-migrated state** between mock data and Supabase. This is causing:
- 409 Conflict errors when voting (duplicate vote attempts)
- User names showing as generic "You" and "Alex" instead of actual user identities
- Confusion between mock data and real database data

## OBJECTIVE
Complete the migration to Supabase and fix the voting system so that:
1. All data comes from Supabase (no mock data)
2. Users see real names (Chase, Jamie, etc.) based on database profiles
3. Voting works correctly for both partners without 409 errors
4. Real-time updates work between partners

---

## CURRENT STATE

### ✅ What's Working
- Database schema fully migrated (see `supabase/migrations/`)
- RLS policies fixed (no more infinite recursion)
- Decisions loading from Supabase successfully
- Real-time subscriptions set up and active
- Test couple configured:
  - **User 1 (Chase)**: `chasewcole@gmail.com` (ID: `a3cc73ea-9c99-42a2-acf5-3aec595fca96`)
  - **User 2 (Partner)**: `chasetest70@gmail.com` (ID: TBD - check after migration 005)
  - **Couple ID**: `11111111-1111-1111-1111-111111111111`

### ❌ What's Broken
1. **Voting System**: 409 Conflict errors when trying to vote twice
2. **User Names**: Still using mock data (`USERS.YOU`, `USERS.PARTNER` from `data/mockData.ts`)
3. **Profile Loading**: Not fetching user profiles from `profiles` table
4. **Vote Checking**: Need to check existing votes before allowing new votes

---

## TASKS TO COMPLETE

### Task 1: Add Profile Management to Database Service
**File**: `lib/database.ts`

Add functions to fetch user profiles:

```typescript
// Add to lib/database.ts

export const getProfileById = async (userId: string): Promise<DatabaseResult<Profile>> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: profile, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

export const getProfilesByCouple = async (coupleId: string): Promise<DatabaseListResult<Profile>> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('couple_id', coupleId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: profiles || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
```

### Task 2: Update UserContext to Include Profile Names
**File**: `lib/database.ts`

Update `getUserContext` to fetch profile names:

```typescript
// Update the return type
export interface UserContext {
  userId: string;
  coupleId: string;
  partnerId: string;
  userName: string;      // ADD THIS
  partnerName: string;   // ADD THIS
}

// Update getUserContext function
export const getUserContext = async (): Promise<UserContext | null> => {
  console.log('🔍 getUserContext called');
  const userId = await getCurrentUser();
  if (!userId) {
    console.log('❌ No user ID found');
    return null;
  }

  console.log('🔍 Looking for couple for user:', userId);
  const coupleResult = await getCoupleByUserId(userId);
  if (!coupleResult.data) {
    console.log('❌ No couple found for user:', userId);
    return null;
  }

  const partnerId =
    coupleResult.data.user1_id === userId
      ? coupleResult.data.user2_id
      : coupleResult.data.user1_id;

  // FETCH PROFILE NAMES
  const userProfileResult = await getProfileById(userId);
  const partnerProfileResult = await getProfileById(partnerId);

  const userName = userProfileResult.data?.display_name || userProfileResult.data?.email || 'You';
  const partnerName = partnerProfileResult.data?.display_name || partnerProfileResult.data?.email || 'Partner';

  console.log('✅ Found user context:', {
    userId,
    coupleId: coupleResult.data.id,
    partnerId,
    userName,
    partnerName
  });

  return {
    userId,
    coupleId: coupleResult.data.id,
    partnerId,
    userName,
    partnerName,
  };
};
```

### Task 3: Update Home Page to Use Real Names
**File**: `app/(protected)/(tabs)/index.tsx`

**Remove mock data imports:**
```typescript
// REMOVE THIS LINE:
import { MOCK_OPTION_LISTS, USERS, ... } from "@/data/mockData";
```

**Update decision transformation to use real names:**
```typescript
// Around line 468-486, UPDATE to use userContext names:
const transformedDecisions: UIDecision[] =
  decisionsResult.data?.map((decision) => ({
    ...decision,
    expanded: false,
    // USE REAL NAMES from userContext
    createdBy: decision.creator_id === context.userId
      ? context.userName
      : context.partnerName,
    details: decision.description || "",
    decidedBy: decision.decided_by
      ? decision.decided_by === context.userId
        ? context.userName
        : context.partnerName
      : undefined,
    decidedAt: decision.decided_at || undefined,
    options: decision.options.map((option) => ({
      id: option.id,
      title: option.title,
      selected: false,
    })),
  })) || [];
```

**Update real-time subscription handler (around line 533):**
```typescript
createdBy: updatedDecision.creator_id === userContext.userId
  ? userContext.userName
  : userContext.partnerName,
```

### Task 4: Fix Voting to Show User's Selected Vote
**File**: `app/(protected)/(tabs)/index.tsx`

When loading decisions, check if user has already voted and mark their selection:

```typescript
// In the initial load (around line 468), UPDATE options mapping:
options: await Promise.all(
  decision.options.map(async (option) => {
    // Check if user voted for this option
    const userVote = await getUserVoteForDecision(decision.id, context.userId, 1);
    return {
      id: option.id,
      title: option.title,
      selected: userVote.data?.option_id === option.id, // Mark selected if user voted for it
    };
  })
),
```

### Task 5: Improve Vote Error Handling
**File**: `app/(protected)/(tabs)/index.tsx`

The current duplicate vote check is good, but let's improve the UX:

```typescript
// In handleDecide function (around line 610):
if (existingVote.data) {
  console.log('⚠️ Home: User has already voted on this decision');

  // Don't show error - instead, just highlight their existing vote
  // Find and mark the option they voted for as selected
  setDecisions((prev) =>
    prev.map((d) =>
      d.id === decisionId
        ? {
            ...d,
            options: d.options.map((opt) => ({
              ...opt,
              selected: opt.id === existingVote.data.option_id,
            })),
          }
        : d,
    ),
  );

  setVoting(null);
  return;
}
```

### Task 6: Update Type Definitions
**File**: `types/database.ts`

Update UserContext interface:

```typescript
export interface UserContext {
  userId: string;
  coupleId: string;
  partnerId: string;
  userName: string;      // ADD
  partnerName: string;   // ADD
}
```

### Task 7: Update CollapsibleCard Props
**File**: `components/ui/CollapsibleCard/CollapsibleCard.tsx`

The `createdBy` and `decidedBy` props should now receive actual names instead of "You"/"Alex":

```typescript
// Props should already be string type, just verify:
interface CollapsibleCardProps {
  title: string;
  createdBy: string;  // Will now be "Chase", "Jamie", etc.
  deadline: string;
  details: string;
  decidedBy?: string; // Will now be "Chase", "Jamie", etc.
  // ... rest of props
}
```

---

## TESTING CHECKLIST

After completing the changes, test with two browsers:

### Browser 1 (Chase - chasewcole@gmail.com)
- [ ] Sign in and verify decisions load
- [ ] Check that decisions show actual names (Chase, Jamie, etc.) not "You"/"Alex"
- [ ] Click a decision created by partner - should show partner's real name
- [ ] Vote on a decision - should work without 409 error
- [ ] Try voting again - should not allow (show existing vote selected)
- [ ] Verify real-time: Create a decision, should appear in Browser 2

### Browser 2 (Partner - chasetest70@gmail.com)
- [ ] Sign in and verify same decisions appear
- [ ] Check names are correct (opposite perspective)
- [ ] Vote on same decision as Browser 1 - should work
- [ ] Verify decision updates in real-time in Browser 1

---

## FILES TO UPDATE

1. ✅ `lib/database.ts` - Add profile fetching functions, update getUserContext
2. ✅ `types/database.ts` - Update UserContext interface
3. ✅ `app/(protected)/(tabs)/index.tsx` - Remove mock data, use real names, improve voting
4. ⚠️ `components/ui/CollapsibleCard/CollapsibleCard.tsx` - Verify props (should already work)

---

## EXPECTED RESULTS

### Before (Current State)
```
Decision created by: Alex  ❌ (mock data)
You voted            ❌ (generic label)
409 Conflict Error   ❌ (duplicate votes)
```

### After (Fixed State)
```
Decision created by: Chase      ✅ (real name from database)
Jamie voted                     ✅ (real partner name)
Vote once, see selection        ✅ (no 409 errors)
Real-time sync working          ✅ (both browsers update)
```

---

## IMPORTANT NOTES

1. **Don't delete mockData.ts yet** - It's still used for option lists (we'll migrate those later)
2. **Test with both browsers** - Critical to verify real-time sync
3. **Check console logs** - Look for the emoji logs (🔍, ✅, ❌, 🔔) to debug
4. **Migration 005** - Make sure you ran `005_update_test_couple.sql` first

---

## DEBUGGING TIPS

If you see 409 errors:
- Check votes table in Supabase: `SELECT * FROM votes WHERE decision_id = 'xxx'`
- Verify unique constraint: `decision_id + user_id + round`
- Clear stuck votes: `DELETE FROM votes WHERE decision_id = 'xxx'`

If names don't show:
- Check profiles table: `SELECT * FROM profiles WHERE couple_id = 'xxx'`
- Verify display_name or email is populated
- Check getUserContext console logs

If real-time doesn't work:
- Check browser console for subscription logs (🔔)
- Verify couple_id matches in both browsers
- Check Supabase realtime is enabled in project settings
