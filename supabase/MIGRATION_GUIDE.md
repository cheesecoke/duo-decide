# Migration Guide: Partner Linking Fix

**Created**: Oct 21, 2025
**Migrations**: 012 & 013
**Priority**: CRITICAL - Must be applied before production use

## What These Migrations Do

### Migration 012: Automatic Partner Linking
- ✅ Automatically links partners when they sign up with invited email
- ✅ Updates couple record (sets user2_id, clears pending_partner_email)
- ✅ Updates both users' profiles with couple_id
- ✅ Fixes partner_id on existing decisions
- ✅ Adds detailed logging for debugging

### Migration 013: Data Cleanup & Policy Updates
- ✅ Adds `cleanup_orphaned_decisions()` function
- ✅ Adds `get_couple_info()` debug function
- ✅ Updates DELETE policy (couple members can delete, not just creators)
- ✅ Enables cleanup of orphaned/invalid decisions

---

## Option 1: Apply via Supabase Dashboard (Recommended)

### Step 1: Apply Migration 012
1. Go to your Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/012_automatic_partner_linking.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify output shows: "Migration 012 completed"

### Step 2: Apply Migration 013
1. Open `supabase/migrations/013_cleanup_and_policy_updates.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify output shows: "Migration 013 completed"

### Step 3: Verify Migrations Applied
Run this query in SQL Editor:
```sql
-- Check if new functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('cleanup_orphaned_decisions', 'get_couple_info', 'handle_new_user');

-- Check if trigger exists
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

You should see:
- `cleanup_orphaned_decisions` function
- `get_couple_info` function
- Updated `handle_new_user` function
- `on_auth_user_created` trigger

---

## Option 2: Apply via Supabase CLI

⚠️ **WARNING**: Earlier we had connection pool issues with the CLI. Use with caution.

```bash
# Apply migration 012
supabase db push --include-all

# Or apply individually
cat supabase/migrations/012_automatic_partner_linking.sql | supabase db execute

cat supabase/migrations/013_cleanup_and_policy_updates.sql | supabase db execute
```

---

## Post-Migration Tasks

### 1. Check Your Couple Status
Run this in SQL Editor:
```sql
SELECT * FROM get_couple_info();
```

This will show:
- Your email and name
- Your couple_id
- Partner info (if linked)
- Pending partner email (if waiting)
- Total decisions
- **Orphaned decision count**

### 2. Cleanup Orphaned Decisions
If `orphaned_count > 0`, run:
```sql
SELECT * FROM cleanup_orphaned_decisions();
```

This will:
- Delete decisions with invalid partner_id
- Delete decisions with invalid creator_id
- Return count of deleted decisions

### 3. Verify Cleanup Worked
```sql
SELECT * FROM get_couple_info();
```

Now `orphaned_count` should be 0.

---

## Testing the Partner Linking Flow

### Test 1: New Partner Signup (Auto-Link)
1. In Settings, invite a partner: `test-partner@example.com`
2. Open **incognito browser**
3. Sign up as `test-partner@example.com`
4. After email confirmation, both users should be linked
5. Verify by running: `SELECT * FROM get_couple_info();`
6. Check that `partner_id` is populated

### Test 2: Shared Decisions
1. User A creates a decision
2. User B should see it in their queue
3. Both users should be able to delete it

### Test 3: Orphaned Decision Cleanup
1. Create a test decision
2. Manually set partner_id to null:
   ```sql
   UPDATE decisions SET partner_id = NULL WHERE id = 'decision-id';
   ```
3. Run: `SELECT * FROM cleanup_orphaned_decisions();`
4. Decision should be deleted

---

## Rollback Instructions (If Needed)

If something goes wrong, you can rollback:

### Rollback Migration 013
```sql
-- Drop cleanup functions
DROP FUNCTION IF EXISTS cleanup_orphaned_decisions(UUID);
DROP FUNCTION IF EXISTS get_couple_info(UUID);

-- Restore old delete policy
DROP POLICY IF EXISTS "Couple members can delete decisions" ON decisions;

CREATE POLICY "Users can delete own decisions"
  ON decisions FOR DELETE
  USING (creator_id = auth.uid());
```

### Rollback Migration 012
```sql
-- Restore old handle_new_user function (from migration 002)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Expected Results

After applying both migrations:

✅ **Automatic Partner Linking Works**
- New signups with invited emails are auto-linked
- Both users see shared couple_id
- Decisions update with correct partner_id

✅ **Orphaned Data Cleaned Up**
- Invalid decisions removed
- Your decision queue shows only valid decisions
- All decisions are deletable

✅ **Better Delete Permissions**
- Both partners can delete any decision in the couple
- No more "stuck" decisions from missing partners

---

## Troubleshooting

### Issue: Migration fails with "relation does not exist"
**Solution**: Make sure migrations 001-011 are already applied.

### Issue: "permission denied for table auth.users"
**Solution**: Use Supabase Dashboard instead of CLI. The trigger needs SECURITY DEFINER.

### Issue: Auto-linking not working
**Check**:
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function source
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Check pending invitations
SELECT * FROM couples WHERE pending_partner_email IS NOT NULL;
```

### Issue: Cleanup function returns 0 but you still see bad decisions
**Check**:
```sql
-- View all decisions for your couple
SELECT d.*, p1.email as creator_email, p2.email as partner_email
FROM decisions d
LEFT JOIN profiles p1 ON d.creator_id = p1.id
LEFT JOIN profiles p2 ON d.partner_id = p2.id
WHERE d.couple_id = (SELECT couple_id FROM profiles WHERE id = auth.uid());
```

---

## Questions?

See [PARTNER_LINKING_ANALYSIS.md](../documents/PARTNER_LINKING_ANALYSIS.md) for full technical details.
