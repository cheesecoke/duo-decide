# CURSOR AGENT MODE: Complete Supabase Migration

## 🎯 MISSION
Complete the Supabase migration to remove all mock data dependencies and fix the voting system. Work autonomously through the checklist below, stopping at checkpoints for human verification.

---

## ⚠️ GUARDRAILS & RULES

### DO:
- ✅ Follow the exact steps in `CURSOR_TASK.md`
- ✅ Read existing code before making changes
- ✅ Keep changes small and focused (one file at a time when possible)
- ✅ Preserve existing functionality while adding new features
- ✅ Add console logs for debugging (use emoji: 🔍, ✅, ❌, ⚠️)
- ✅ Update type definitions when changing interfaces
- ✅ Test each change by running the dev server

### DON'T:
- ❌ Delete `data/mockData.ts` (still used for option lists)
- ❌ Change database schema or migrations
- ❌ Modify RLS policies
- ❌ Remove any existing functionality
- ❌ Skip type checking
- ❌ Make breaking changes to component props
- ❌ Commit any changes (human will review and commit)

### STOP & ASK IF:
- 🛑 You encounter TypeScript errors you can't resolve
- 🛑 Tests are failing
- 🛑 You need to change database schema
- 🛑 You're unsure about a design decision
- 🛑 The app crashes or won't start

---

## 📋 AUTONOMOUS TASK CHECKLIST

Work through these tasks in order. Mark each as complete before moving to the next.

### Phase 1: Add Profile Management (15 min)
**File**: `lib/database.ts`

- [ ] **Task 1.1**: Add `getProfileById` function
  - Copy code from `CURSOR_TASK.md` Task 1
  - Add proper error handling
  - Test by calling it in console

- [ ] **Task 1.2**: Add `getProfilesByCouple` function
  - Copy code from `CURSOR_TASK.md` Task 1
  - Add proper error handling
  - Test by calling it in console

- [ ] **CHECKPOINT 1**: Verify functions work
  ```typescript
  // Test in browser console:
  const profile = await getProfileById('a3cc73ea-9c99-42a2-acf5-3aec595fca96');
  console.log('Profile:', profile);
  ```

---

### Phase 2: Update UserContext (10 min)
**Files**: `types/database.ts`, `lib/database.ts`

- [ ] **Task 2.1**: Update `UserContext` interface in `types/database.ts`
  - Add `userName: string`
  - Add `partnerName: string`

- [ ] **Task 2.2**: Update `getUserContext` function in `lib/database.ts`
  - Fetch user and partner profiles
  - Extract display names (fallback to email if no display_name)
  - Return updated context with names
  - Add console logs to show names loaded

- [ ] **CHECKPOINT 2**: Verify context includes names
  ```typescript
  // Test in browser console:
  const context = await getUserContext();
  console.log('Context:', context);
  // Should show: { userId, coupleId, partnerId, userName, partnerName }
  ```

---

### Phase 3: Remove Mock Data from Home Page (20 min)
**File**: `app/(protected)/(tabs)/index.tsx`

- [ ] **Task 3.1**: Remove mock data import
  - Remove line: `import { MOCK_OPTION_LISTS, USERS, ... } from "@/data/mockData";`
  - Keep only what's needed for option lists (if any)

- [ ] **Task 3.2**: Update initial decision transformation (around line 468)
  - Change `createdBy` to use `context.userName` / `context.partnerName`
  - Change `decidedBy` to use `context.userName` / `context.partnerName`
  - Remove all references to `USERS.YOU` and `USERS.PARTNER`

- [ ] **Task 3.3**: Update real-time subscription handler (around line 533)
  - Change `createdBy` to use `userContext.userName` / `userContext.partnerName`
  - Change `decidedBy` to use `userContext.userName` / `userContext.partnerName`
  - Remove all references to `USERS.YOU` and `USERS.PARTNER`

- [ ] **Task 3.4**: Update decision completion handler (around line 664, 680)
  - Change to use `userContext.userName`
  - Remove `USERS.YOU` references

- [ ] **CHECKPOINT 3**: Verify app compiles and runs
  ```bash
  # Should compile without errors
  # Check browser - decisions should show real names
  ```

---

### Phase 4: Fix Voting System (25 min)
**File**: `app/(protected)/(tabs)/index.tsx`

- [ ] **Task 4.1**: Load existing votes on page load (around line 481)
  - For each decision, check if user has voted
  - Mark the voted option as `selected: true`
  - Update the code snippet from `CURSOR_TASK.md` Task 4

- [ ] **Task 4.2**: Improve duplicate vote handling in `handleDecide` (around line 610)
  - Instead of showing error, mark existing vote as selected
  - Update the code from `CURSOR_TASK.md` Task 5
  - Remove error message, just highlight selection

- [ ] **Task 4.3**: Improve duplicate vote handling in `handlePollOptionSelect` (around line 755)
  - Same as Task 4.2 but for poll votes
  - Mark existing vote as selected
  - Don't show error

- [ ] **CHECKPOINT 4**: Test voting
  ```bash
  # In browser:
  # 1. Vote on a decision - should work
  # 2. Refresh page - should show your vote selected
  # 3. Try voting again - should just highlight your vote (no error)
  # 4. No 409 errors in console
  ```

---

### Phase 5: Testing & Verification (15 min)

- [ ] **Task 5.1**: Test in main browser (Chase)
  - Sign in as `chasewcole@gmail.com`
  - Verify decisions show "Chase" and "Jamie" (not "You"/"Alex")
  - Vote on a decision
  - Refresh - vote should still be selected
  - Try voting again - should highlight existing vote

- [ ] **Task 5.2**: Test in second browser (Jamie)
  - Sign in as `chasetest70@gmail.com` in incognito
  - Verify same decisions appear
  - Verify names are correct
  - Vote on same decision
  - Verify both votes work without 409 errors

- [ ] **Task 5.3**: Test real-time sync
  - Create decision in Browser 1 (Chase)
  - Verify it appears in Browser 2 (Jamie)
  - Vote in Browser 2
  - Verify update appears in Browser 1

- [ ] **CHECKPOINT 5**: All tests pass
  ```
  ✅ Names show correctly (Chase, Jamie)
  ✅ Voting works without 409 errors
  ✅ Existing votes show on page load
  ✅ Real-time updates work between browsers
  ✅ No TypeScript errors
  ✅ No console errors (except known warnings)
  ```

---

## 🚦 PROGRESS TRACKING

Update this section as you complete tasks:

### Current Phase: _[Agent will update]_
### Tasks Completed: _[0/15]_
### Blockers: _[None]_
### Last Checkpoint Passed: _[None]_

---

## 🐛 COMMON ISSUES & FIXES

### Issue: TypeScript error "Property 'userName' does not exist"
**Fix**: Make sure you updated `types/database.ts` first (Task 2.1)

### Issue: Names showing as "undefined"
**Fix**: Check that profiles table has `display_name` set:
```sql
UPDATE profiles SET display_name = 'Chase' WHERE email = 'chasewcole@gmail.com';
UPDATE profiles SET display_name = 'Jamie' WHERE email = 'chasetest70@gmail.com';
```

### Issue: 409 errors still happening
**Fix**: Make sure you're checking for existing votes BEFORE trying to insert (Task 4.2, 4.3)

### Issue: Can't find `getUserVoteForDecision` function
**Fix**: It's already in `lib/database.ts` at line 284. Make sure import is correct.

### Issue: App won't compile after changes
**Fix**:
1. Check for missing imports
2. Check for syntax errors
3. Run `npm run typecheck` to see all errors
4. Revert last change if needed

---

## 📊 SUCCESS CRITERIA

Before marking complete, verify ALL of these:

- [ ] ✅ No TypeScript compilation errors
- [ ] ✅ App runs without crashing
- [ ] ✅ Decision creators show real names (Chase, Jamie) not mock names
- [ ] ✅ Voting works for both users without 409 errors
- [ ] ✅ Existing votes show as selected on page load
- [ ] ✅ Real-time updates work between browsers
- [ ] ✅ Console shows emoji logs (🔍, ✅, ⚠️) for debugging
- [ ] ✅ No breaking changes to existing features
- [ ] ✅ All checkpoints passed

---

## 🎬 GETTING STARTED

**Cursor Composer Instructions:**

1. Open Cursor Composer in Agent Mode (Cmd+Shift+I)
2. Set to **MAX mode** for autonomous operation
3. Copy this prompt:

```
Complete the Supabase migration by following CURSOR_AGENT_PROMPT.md.
Work through each phase autonomously, stopping at checkpoints for verification.
Update the progress tracking section as you complete tasks.
Follow all guardrails and rules strictly.
Start with Phase 1, Task 1.1.
```

4. Let the agent work through the checklist
5. Review changes at each checkpoint
6. Test thoroughly before moving to next phase

---

## 📝 NOTES FOR HUMAN REVIEWER

After agent completes:
- [ ] Review all code changes
- [ ] Test with both browsers (Chase + Jamie)
- [ ] Verify no regressions
- [ ] Run `git diff` to see all changes
- [ ] Commit with message: "feat: complete Supabase migration - remove mock data, add real user names"
- [ ] Update TODO.md to mark tasks as complete

---

## 🔗 REFERENCE FILES

- **Task Details**: `CURSOR_TASK.md`
- **Implementation Guide**: `IMPLEMENTATION.md`
- **TODO Tracking**: `TODO.md`
- **Test Users**: See `IMPLEMENTATION.md` → Test Users section
- **Database Functions**: `lib/database.ts`
- **Type Definitions**: `types/database.ts`
- **Main Component**: `app/(protected)/(tabs)/index.tsx`
