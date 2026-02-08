# Partner Linking Analysis & Issues

**Date**: Oct 21, 2025
**Status**: Critical Issues Identified

## Current State

### What Works ✅

1. **Partner Invitation UI** (Settings Modal)
   - User can enter partner email
   - Email is stored in `couples.pending_partner_email`
   - Cancel and resend functionality implemented
   - Email validation in place

2. **Partner Setup Flow** (`/setup-partner` page)
   - New users can enter their name and partner email
   - Creates couple record with `user1_id` and `pending_partner_email`
   - Updates profile with couple_id

3. **Database Schema** (Migration 010 & 011)
   - `couples.user2_id` can now be NULL (allows single-user couples)
   - `couples.pending_partner_email` field exists
   - Index on `pending_partner_email` for fast lookups

### Critical Issues 🚨

#### Issue #1: No Automatic Partner Linking

**Problem**: When a user signs up with an email that matches a `pending_partner_email`, they are NOT automatically linked to the existing couple.

**Current Behavior**:

```
User A signs up → creates couple with pending_partner_email = "user-b@example.com"
User B signs up with "user-b@example.com" → creates NEW couple (orphaned)
Result: Two separate couples, no connection
```

**Expected Behavior**:

```
User A signs up → creates couple with pending_partner_email = "user-b@example.com"
User B signs up with "user-b@example.com" → linked to User A's couple as user2_id
Result: One couple, both users linked
```

**Root Cause**: The `handle_new_user()` trigger only creates a profile, doesn't check for pending invitations:

```sql
-- Current implementation (002_safe_schema_update.sql)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Missing Logic**:

- Check if `NEW.email` matches any `pending_partner_email`
- If match found, update that couple's `user2_id`
- Update new user's `couple_id` to match
- Clear the `pending_partner_email`

---

#### Issue #2: Orphaned Decisions

**Problem**: Old decisions from deleted/missing partners cannot be deleted by the remaining user.

**Current RLS Policy**:

```sql
CREATE POLICY "Users can delete own decisions"
  ON decisions FOR DELETE
  USING (creator_id = auth.uid());
```

**Scenario**:

```
1. User A creates couple, invites Partner B
2. Before B signs up, A creates decisions (with partner_id pointing to... null? old data?)
3. B never signs up, or couple gets broken
4. User A can only delete decisions THEY created
5. Decisions created by missing partner are stuck forever
```

**Impact**:

- User cannot clean up their decision queue
- Data integrity issues
- Poor user experience

**Potential Solutions**:

1. Allow deletion if user is in the couple (not just creator)
2. Add cascade deletion when partner is removed
3. Add manual "cleanup orphaned decisions" function
4. Update policy to check couple_id instead of just creator_id

---

#### Issue #3: Incomplete Onboarding Flow

**Problem**: New users may skip `/setup-partner` and end up with no couple.

**Current Flow**:

```
Sign Up → Email Confirmation → ??? → Dashboard
```

**Missing**:

- Redirect logic after email confirmation
- Check if user has `couple_id`
- Force setup-partner page if no couple
- Handle case where user should be auto-linked vs. create new couple

---

## Data Cleanup Needed

### Current User's Data

Based on user feedback, they have:

- Old decisions with no valid partner
- Possibly decisions they can't delete
- Orphaned data from testing/development

**Cleanup Tasks**:

1. Identify orphaned decisions (decisions where partner_id doesn't exist or couple is broken)
2. Either delete or reassign to current couple
3. Verify all decisions have valid couple_id and partner_id

---

## Proposed Solutions

### Solution 1: Enhanced `handle_new_user()` Trigger

Create migration `012_automatic_partner_linking.sql`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_couple_id UUID;
  v_existing_couple couples;
BEGIN
  -- Create profile first
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;

  -- Check if this email matches any pending partner invitation
  SELECT * INTO v_existing_couple
  FROM couples
  WHERE LOWER(pending_partner_email) = LOWER(NEW.email)
  AND user2_id IS NULL  -- Only link if partner slot is empty
  LIMIT 1;

  IF FOUND THEN
    -- Auto-link as partner
    UPDATE couples
    SET user2_id = NEW.id,
        pending_partner_email = NULL,
        updated_at = NOW()
    WHERE id = v_existing_couple.id;

    -- Update new user's profile with couple_id
    UPDATE profiles
    SET couple_id = v_existing_couple.id
    WHERE id = NEW.id;

    RAISE NOTICE 'Auto-linked user % to couple %', NEW.email, v_existing_couple.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 2: Improved Delete Policy

Update RLS policy to allow couple members to delete decisions:

```sql
-- Anyone in the couple can delete decisions
CREATE POLICY "Couple members can delete decisions"
  ON decisions FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Solution 3: Orphaned Decision Cleanup Function

Add database function to clean up orphaned decisions:

```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_decisions(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete decisions where partner no longer exists
  DELETE FROM decisions
  WHERE couple_id IN (
    SELECT couple_id FROM profiles WHERE id = p_user_id
  )
  AND (
    partner_id NOT IN (SELECT id FROM profiles)
    OR partner_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 4: Protected Onboarding Redirect

Add middleware to check couple status:

```typescript
// app/(protected)/_layout.tsx
useEffect(() => {
	const checkCoupleStatus = async () => {
		const context = await getUserContext();
		if (!context.coupleId) {
			// User has no couple, send to setup
			router.replace("/setup-partner");
		}
	};
	checkCoupleStatus();
}, []);
```

---

## Testing Plan

### Phase 1: Partner Linking

1. User A signs up, goes to `/setup-partner`, enters partner email
2. User B signs up with that exact email
3. Verify User B is automatically linked to User A's couple
4. Verify both users see each other's decisions
5. Verify `pending_partner_email` is cleared

### Phase 2: Data Cleanup

1. Run orphaned decision cleanup for current user
2. Verify all decisions are deletable
3. Verify decision queue shows only valid decisions

### Phase 3: Onboarding Flow

1. Sign up as new user
2. Verify redirect to `/setup-partner` if no couple
3. Create couple with partner invite
4. Verify redirect to dashboard after setup

---

## Implementation Priority

1. **🔴 Critical - Automatic Partner Linking** (Solution 1)
   - Fixes the core partner linking issue
   - Enables true multi-user functionality
   - Migration `012_automatic_partner_linking.sql`

2. **🟠 High - Data Cleanup** (Solution 3)
   - Fixes current user's orphaned data
   - Adds utility function for future cleanup
   - Migration `013_orphaned_decision_cleanup.sql`

3. **🟡 Medium - Delete Policy Update** (Solution 2)
   - Improves UX for decision management
   - Prevents future orphaned decision issues
   - Update existing policy in migration

4. **🟢 Low - Onboarding Redirect** (Solution 4)
   - Nice-to-have for better UX
   - Prevents edge cases
   - Code change, no migration

---

## Next Steps

See [TODO.md](./TODO.md) for task breakdown and implementation order.
