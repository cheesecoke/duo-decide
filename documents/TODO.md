# Duo - TODO Tracking

> **Purpose**: Track outstanding tasks, bugs, and improvements for the Duo app.
> This file is designed to integrate with your ticket management system.

## 🚨 CRITICAL: Partner Linking & Data Integrity Issues

**Status**: Blocking production use
**Analysis**: See [PARTNER_LINKING_ANALYSIS.md](./PARTNER_LINKING_ANALYSIS.md) for full details

###Critical Issues Identified (Oct 21, 2025)

1. **No Automatic Partner Linking** - Users who sign up with invited email are NOT automatically linked
2. **Orphaned Decisions** - Old decisions from missing partners cannot be deleted
3. **Data Cleanup Needed** - Current user has orphaned/invalid data

### 🔴 Priority 1: Fix Partner Linking (BLOCKING)

- [x] **Migration 012: Automatic Partner Linking** ✅ READY TO APPLY
  - [x] Enhance `handle_new_user()` trigger to check for pending invitations
  - [x] Auto-link user2_id when email matches pending_partner_email
  - [x] Update new user's couple_id
  - [x] Clear pending_partner_email after linking
  - [x] Add logging for debugging
  - [x] Update existing decisions with correct partner_id
  - **File**: `supabase/migrations/012_automatic_partner_linking.sql`

- [x] **Migration 013: Data Cleanup & Policy Updates** ✅ READY TO APPLY
  - [x] Add `cleanup_orphaned_decisions()` function
  - [x] Add `get_couple_info()` debug function
  - [x] Update DELETE policy to allow couple members (not just creators)
  - **File**: `supabase/migrations/013_cleanup_and_policy_updates.sql`

- [x] **Migration Guide Created** ✅
  - See `supabase/MIGRATION_GUIDE.md` for step-by-step instructions

**⚠️ NEXT STEPS**:
1. Apply migrations via Supabase Dashboard (see MIGRATION_GUIDE.md)
2. Run `SELECT * FROM get_couple_info();` to check your status
3. Run `SELECT * FROM cleanup_orphaned_decisions();` to clean up
4. Test partner linking flow with two accounts

- [ ] **Apply Migrations to Database**
  - [ ] Apply Migration 012 via Supabase Dashboard
  - [ ] Apply Migration 013 via Supabase Dashboard
  - [ ] Verify migrations succeeded

- [ ] **Data Cleanup**
  - [ ] Run `get_couple_info()` to check orphaned count
  - [ ] Run `cleanup_orphaned_decisions()` if needed
  - [ ] Verify orphaned_count is 0

- [ ] **Test End-to-End Partner Flow**
  - [ ] User A signs up, creates couple with partner email
  - [ ] User B signs up with invited email
  - [ ] Verify auto-linking works
  - [ ] Verify both see shared decisions
  - [ ] Verify both can delete decisions

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
- [ ] History page Supabase integration
  - [ ] Store all decided decisions in database for couple history
  - [ ] Verify completed decisions are properly persisted
  - [ ] Create query to fetch completed decisions for history page
- [ ] Complete decision functionality

---

## Technical Debt & Improvements

### High Priority

- [ ] **Fix React Native Web warnings**
  - [ ] Replace deprecated `shadow*` props with `boxShadow`
  - [ ] Replace deprecated `props.pointerEvents` with `style.pointerEvents`
  - [ ] Fix SVG icon DOM property warnings (`flood-opacity`, `color-interpolation-filters`)

- [ ] **Voting System Implementation**
  - [ ] Implement vote creation in database
  - [ ] Add vote counting logic
  - [ ] Handle round progression for polls
  - [ ] Add "waiting for partner" states
  - [ ] Block creator in Round 3 of polls

- [ ] **Decision Completion**
  - [ ] Add `decided_by`, `decided_at`, `final_decision` handling
  - [ ] Move completed decisions to history automatically
  - [ ] Show completion animations

### Medium Priority

- [ ] **Real-time Subscriptions Enhancement**
  - [ ] Add vote subscriptions
  - [ ] Add option list subscriptions
  - [ ] Handle connection errors gracefully
  - [ ] Add reconnection logic

- [ ] **UI/UX Polish**
  - [ ] Add loading states for all async operations
  - [ ] Add error states and user-friendly messages
  - [ ] Add success confirmations (toasts/snackbars)
  - [ ] Improve mobile responsive layouts

- [ ] **Data Validation**
  - [ ] Add client-side validation for forms
  - [ ] Add TypeScript runtime validation (Zod/Yup)
  - [ ] Better error handling for database operations

### Low Priority

- [ ] **Performance Optimization**
  - [ ] Add pagination for decision history
  - [ ] Lazy load heavy components
  - [ ] Optimize real-time subscription updates
  - [ ] Add loading skeletons

- [ ] **Code Quality**
  - [ ] Extract common patterns into hooks
  - [ ] Reduce duplicate code in CollapsibleCard
  - [ ] Add JSDoc comments to complex functions
  - [ ] Standardize error handling patterns

- [ ] **Testing**
  - [ ] Add unit tests for database functions
  - [ ] Add integration tests for voting flows
  - [ ] Add E2E tests for critical paths
  - [ ] Test RLS policies thoroughly

---

## Known Issues

### Blockers

- None currently

### Bugs

- [ ] Web: `useNativeDriver` warning (expected, falls back to JS animations)
  - **Priority**: Low
  - **Impact**: Minor performance on web
  - **Fix**: Accept as limitation or implement web-specific animations

### UI Issues

- [ ] SVG icons have DOM property warnings on web
  - **Priority**: Low
  - **Impact**: Console noise only, no functional impact
  - **Fix**: Update icon library or create web-compatible versions

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
