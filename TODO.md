# Duo - TODO Tracking

> **Purpose**: Track outstanding tasks, bugs, and improvements for the Duo app.
> This file is designed to integrate with your ticket management system.

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
