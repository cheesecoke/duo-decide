# Duo - TODO Tracking

> **Purpose**: Track outstanding tasks, bugs, and improvements for the Duo app.
> This file is designed to integrate with your ticket management system.

## ✅ Partner Linking & Data Integrity - RESOLVED

**Status**: Ready for partner testing
**Last Updated**: Feb 5, 2026

### Migrations Applied (001-016)

All migrations have been applied to the database:

- 001-015: Core schema, RLS policies, partner invitation system
- **016**: Fixed `get_couple_info()` ambiguous column bug

### Data Cleanup Completed (Feb 5, 2026)

- ✅ Deleted 6 orphaned decisions (invalid creator/partner IDs)
- ✅ Deleted 2 self-referencing test decisions
- ✅ Deleted 1 orphaned couple record
- ✅ Database now clean: 0 decisions, 0 orphaned records

### Current Database State

```
User: chasewcole@gmail.com
Couple ID: 11111111-1111-1111-1111-111111111111
Partner: Not linked yet (user2_id = NULL)
Pending Invitation: chasetest70@gmail.com
Decisions: 0 (clean slate for testing)
```

### 🧪 Ready for Partner Testing

- [ ] **Test End-to-End Partner Flow**
  - [ ] Open incognito browser
  - [ ] Sign up as chasetest70@gmail.com
  - [ ] Verify auto-linking works (user2_id populated)
  - [ ] Verify pending_partner_email is cleared
  - [ ] Create a decision as Chase
  - [ ] Verify partner sees the decision
  - [ ] Test voting flow between partners

### Verification Queries

```sql
-- Check couple state
SELECT * FROM get_couple_info();

-- Check all profiles
SELECT id, email, couple_id FROM profiles;

-- Check decisions are valid
SELECT d.title, p1.email as creator, p2.email as partner
FROM decisions d
JOIN profiles p1 ON d.creator_id = p1.id
JOIN profiles p2 ON d.partner_id = p2.id;
```

---

## Current Sprint - Phase 5: Supabase Integration

### ✅ Completed

- [x] Database schema design and migrations
- [x] RLS policies setup (fixed infinite recursion)
- [x] Connect Decision Queue to Supabase
- [x] Implement real-time subscriptions
- [x] Test basic data loading

### ✅ Recently Completed (Phase 5 - Critical Tasks Complete!)

**Task 1 & 2: User Profiles and Voting (CRITICAL FIXES)**

- [x] Add profile fetching to database.ts (`getProfileById`, `getProfilesByCouple`)
- [x] Update UserContext to include `userName` and `partnerName`
- [x] Remove mock data dependency from index.tsx (USERS.YOU, USERS.PARTNER)
- [x] Display real user names from profiles table
- [x] Fix 409 voting errors (update existing votes instead of creating duplicates)
- [x] Show user's existing vote selection on page load

**Task 3: Voting System Implementation**

- [x] Add `getVoteCountsForDecision` to calculate vote results
- [x] Add `checkRoundCompletion` to verify both partners voted
- [x] Add `progressToNextRound` for poll round progression
- [x] Remove USERS mock data from CollapsibleCard components
- [x] Vote privacy controls (hide votes until both complete round)
- [x] Creator blocking in Round 3 of polls

**Task 4: Decision Completion**

- [x] Add `completeDecision` function
- [x] Add current_round field to Decision type

**Task 5: Code Refactoring & Organization (Oct 19, 2025)**

- [x] Extract voting logic into `useDecisionVoting` hook (270+ lines)
- [x] Extract CRUD operations into `useDecisionManagement` hook (150+ lines)
- [x] Extract data loading into `useDecisionsData` hook (250+ lines)
- [x] Extract form component into `CreateDecisionForm` (420+ lines)
- [x] Reduce index.tsx from 1,532 lines to 276 lines (67% reduction)

**Task 6: Partner Invitation System (Oct 19, 2025)**

- [x] Allow null partner IDs in database schema (migration 010)
- [x] Add `pending_partner_email` to couples table (migration 011)
- [x] Create `invitePartner()` database function
- [x] Create `cancelPartnerInvitation()` database function
- [x] Add partner invitation UI in Settings modal
- [x] Add cancel invitation functionality
- [x] Add resend invitation functionality
- [x] Email validation for partner invitations
- [x] Reactive drawer updates with useEffect
- ⚠️ **NOTE**: Automatic partner linking on signup is NOT implemented yet (see Priority 1 above)

**Task 7: Option Lists Supabase Integration (Oct 21, 2025)**

- [x] Add `updateOptionList()` and `deleteOptionList()` to database.ts
- [x] Update Options tab to load from Supabase
- [x] Convert all CRUD operations to async/Supabase
- [x] Update CreateDecisionForm to receive optionLists prop
- [x] Load option lists in Decision Queue (index.tsx)
- [x] Transform data structure (items ↔ options)
- [x] Add error handling and display
- [x] Remove all MOCK_OPTION_LISTS dependencies
- ✅ **Result**: Options tab and Create Decision form now fully connected to Supabase

### 🧪 Ready for Testing

**Test with two browsers (Chase + Jamie accounts)**

- [ ] Test decision creation and real-time sync
- [ ] Test voting with real user names displayed
- [ ] Test vote update (changing vote)
- [ ] Test vote privacy in polls
- [ ] Test creator blocking in Round 3
- [ ] Test decision completion

### 🚧 In Progress - Remaining Tasks

**Next Priority: Integrate and Test**

### 📋 Upcoming (After Migration Complete)

- [ ] Test voting flows with real data
  - [ ] Vote mode: Single-round voting
  - [ ] Poll mode: Multi-round polling (Rounds 1-3)
  - [ ] Real-time vote updates between partners
- [ ] Option Lists Supabase integration
- [x] **History page Supabase integration** (MVP - Feb 2026)
  - [x] Store all decided decisions in database for couple history
  - [x] Verify completed decisions are properly persisted (decided_by, decided_at, final_decision)
  - [x] Create query to fetch completed decisions for history page
  - [x] Order history by decided_at (most recent first)
  - [x] Pagination (20 per page, load more)
  - [x] Total count for accurate stats
  - [x] Loading state with spinner
  - [x] Error state with retry button
- [x] Complete decision functionality

---

## Technical Debt & Improvements

### High Priority

- [x] **Fix React Native Web warnings** (MVP cleanup - Feb 2026)
  - [x] Replace deprecated `shadow*` props with `boxShadow`
  - [x] Replace deprecated `props.pointerEvents` with `style.pointerEvents` (N/A: already using style)
  - [x] Fix SVG icon DOM property warnings (removed unused filter from IconHouseChimney)

- [ ] **Voting System Implementation**
  - [ ] Implement vote creation in database
  - [ ] Add vote counting logic
  - [ ] Handle round progression for polls
  - [ ] Add "waiting for partner" states
  - [ ] Block creator in Round 3 of polls

- [x] **Decision Completion**
  - [x] Add `decided_by`, `decided_at`, `final_decision` handling
  - [x] Move completed decisions to history automatically
  - [ ] Show completion animations

### Medium Priority

- [x] **Real-time Subscriptions Enhancement** (MVP – wt-realtime, Feb 2026)
  - [x] Add vote subscriptions (integrated in useDecisionsData; unique channel per decision)
  - [x] Add option list subscriptions (option_lists + option_list_items in OptionListsProvider)
  - [x] Handle connection errors gracefully (non-blocking “Reconnecting…” banner via RealtimeStatusProvider)
  - [x] Add reconnection logic (refetch decisions and option lists on SUBSCRIBED after disconnect)
  - **Note**: If option list real-time events are not received, add `option_lists` and `option_list_items` to the `supabase_realtime` publication in Supabase.

- [ ] **UI/UX Polish**
  - [x] Add loading states for History page (spinner + text)
  - [x] Add error states and retry for History page
  - [ ] Add loading states for all other async operations
  - [ ] Add error states and user-friendly messages elsewhere
  - [ ] Add success confirmations (toasts/snackbars)
  - [ ] Improve mobile responsive layouts

- [ ] **Data Validation**
  - [ ] Add client-side validation for forms
  - [ ] Add TypeScript runtime validation (Zod/Yup)
  - [ ] Better error handling for database operations

### Low Priority

- [ ] **Performance Optimization**
  - [x] Add pagination for decision history (implemented - 20 per page, load more)
  - [ ] Lazy load heavy components
  - [ ] Optimize real-time subscription updates
  - [ ] Add loading skeletons

- [ ] **Code Quality**
  - [ ] Extract common patterns into hooks
  - [ ] Reduce duplicate code in CollapsibleCard
  - [ ] Add JSDoc comments to complex functions
  - [ ] Standardize error handling patterns

- [x] **Testing** (MVP – Feb 2026)
  - [x] Add unit tests for database functions (32 tests: recordVote, getVoteCountsForDecision, checkRoundCompletion, progressToNextRound, completeDecision, etc.)
  - [x] Add unit tests for hooks (useDecisionVoting, useDecisionsData – 29 tests covering vote/poll flows, creator blocking, data loading)
  - [x] Add integration tests for voting flows (12 tests: full vote mode, poll rounds 1→2→3, creator blocking in R3, early completion)
  - [x] Add E2E specs for critical paths (auth-flow, vote-mode, poll-mode, history – Maestro YAML)
  - [ ] Test RLS policies thoroughly

---

## Known Issues

### Blockers

- None currently

### Bugs

- [x] Web: `useNativeDriver` warning (fixed - Feb 2026)
  - **Fix applied**: Use `useNativeDriver: false` on web (Platform.OS check) in BottomDrawer, OptionCard

### UI Issues

- [x] SVG icons have DOM property warnings on web (fixed - Feb 2026)
  - **Fix applied**: Removed unused filter/defs from IconHouseChimney (flood-opacity, color-interpolation-filters)

---

## Feature Requests

### Phase 6: Enhanced Features

- [ ] **Couples Linking System**
  - [ ] Send invitation to partner
  - [ ] Accept/reject invitation flow
  - [ ] Couple onboarding experience

- [ ] **Push Notifications**
  - [ ] Partner voted notification
  - [ ] Round progressed notification
  - [ ] Decision completed notification
  - [ ] Deadline approaching reminders

- [ ] **Calendar Integration**
  - [ ] Visual date picker for deadlines
  - [ ] Sync with device calendar
  - [ ] Show upcoming deadlines

- [ ] **Decision Templates**
  - [ ] Save common decision patterns
  - [ ] Quick create from templates
  - [ ] Share templates between couples

### Phase 7: Analytics & History

- [ ] **Enhanced History**
  - [ ] Filter by date range
  - [ ] Search decisions
  - [ ] Export decision history

- [ ] **Statistics Dashboard**
  - [ ] Decision trends over time
  - [ ] Most popular options
  - [ ] Response time analytics
  - [ ] Couple compatibility insights

### Phase 8: Advanced Features

- [ ] **Decision Comments**
  - [ ] Add notes to decisions
  - [ ] Comment threads
  - [ ] @ mentions for partner

- [ ] **Offline Support**
  - [ ] Cache decisions locally
  - [ ] Queue actions when offline
  - [ ] Sync when back online

- [ ] **Web-Specific Features**
  - [ ] Desktop-optimized layouts
  - [ ] Keyboard shortcuts
  - [ ] Multi-window support

---

## Migration Scripts Completed

1. ✅ `001_initial_schema.sql` - Initial database schema
2. ✅ `002_safe_schema_update.sql` - Safe policy recreation
3. ✅ `003_add_decision_completion_fields.sql` - Completion tracking
4. ✅ `004_fix_rls_recursion.sql` - Fixed infinite recursion in RLS
5. ✅ `005_update_test_couple.sql` - Test couple setup
6. ✅ `006_add_current_round_to_decisions.sql` - Poll round tracking
7. ✅ `007_ensure_user_profiles.sql` - Profile creation trigger
8. ✅ `008_fix_votes_foreign_key.sql` - Votes FK constraint
9. ✅ `009_fix_decision_options_rls.sql` - Options RLS policies
10. ✅ `010_allow_null_user2.sql` - Allow solo users
11. ✅ `011_add_pending_partner_email.sql` - Partner invitation field
12. ✅ `012_automatic_partner_linking.sql` - Auto-link on signup
13. ✅ `013_cleanup_and_policy_updates.sql` - Cleanup functions
14. ✅ `014_fix_profiles_rls_for_trigger.sql` - Trigger RLS fix
15. ✅ `015_fix_profiles_rls_recursion_again.sql` - Final RLS recursion fix
16. ✅ `016_fix_get_couple_info_ambiguous_column.sql` - Fix ambiguous column bug

---

## Documentation Tasks

- [ ] Update README with setup instructions
- [ ] Document environment variables
- [ ] Create API documentation for database functions
- [ ] Add inline code comments for complex logic
- [ ] Create user guide for couples
- [ ] Document RLS policy decisions

---

## Notes

### Testing Strategy

- Manual testing with two separate accounts (couple simulation)
- Focus on real-time sync between partners
- Test all voting scenarios (vote mode + poll rounds 1-3)
- Verify privacy controls in polls

### Development Guidelines

- Small, focused commits (per user instructions)
- Break work into reviewable chunks
- Test each feature thoroughly before moving on
- Keep CLAUDE.md and TODO.md updated

### Deployment Status

- **Database**: Migrations run successfully
- **Authentication**: Working (Supabase Auth)
- **Real-time**: Connected and subscribed
- **Status**: Ready for voting system implementation
