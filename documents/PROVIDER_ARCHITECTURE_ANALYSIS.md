# Provider Architecture Analysis

**Date**: Oct 21, 2025
**Purpose**: Determine optimal state management pattern for Duo app

## Current State

### Existing Providers
1. **ThemeProvider** - UI state (light/dark mode) ✅
2. **DrawerProvider** - UI state (drawer open/close, content) ✅
3. **SupabaseProvider** - Auth (user, session, sign in/out) ✅

### Current Data Patterns

#### Page-Specific State (Working Well)
**Decision Queue (`index.tsx`)**:
```typescript
// Custom hooks (page-specific)
const { decisions, userContext, pollVotes, loading } = useDecisionsData();
const { voting, handleVote } = useDecisionVoting();
const { creating, createNewDecision } = useDecisionManagement();
const [optionLists, setOptionLists] = useState(...); // ❌ Problem!
```

**Options Page (`options.tsx`)**:
```typescript
const [lists, setLists] = useState(...);
const [userContext, setUserContext] = useState(...);
```

**History Page (`history.tsx`)**: Currently just mock UI

---

## Data Sharing Analysis

### What Each Page Needs

| Page | User Context | Option Lists | Decisions | Votes |
|------|-------------|--------------|-----------|-------|
| **Decision Queue** | ✅ | ✅ | ✅ | ✅ |
| **Options** | ✅ | ✅ | ❌ | ❌ |
| **History** | ✅ | ❌ | ✅ (completed) | ❌ |
| **Settings** | ✅ | ❌ | ❌ | ❌ |

### Sharing Patterns

**🟢 Truly Global (Needed Everywhere)**:
- User Context (user info, couple_id, partner info)

**🟡 Shared Across 2+ Pages**:
- Option Lists (Options page + Decision Queue)
- Decisions (Decision Queue + History - but different queries)

**🔵 Page-Specific**:
- Poll Votes (only Decision Queue)
- Active decisions (only Decision Queue)
- Completed decisions (only History)

---

## The Current Problem

**Issue**: Option Lists state not synchronized

```
Options Page creates list → saves to DB ✅
Decision Queue still has old state → doesn't see new list ❌
User has to refresh page ❌
```

**Root Cause**: No shared state management for Option Lists

---

## Architecture Options

### Option 1: Single "AppDataProvider" 🔴 NOT RECOMMENDED

```typescript
<AppDataProvider>
  {/* Provides: userContext, optionLists, decisions, votes */}
  <App />
</AppDataProvider>
```

**Pros**:
- Single source of truth
- Simple to understand

**Cons**:
- ❌ Violates separation of concerns
- ❌ Everything re-renders when anything changes
- ❌ Bloated provider (decisions/votes not needed on Options page)
- ❌ Couples unrelated data

---

### Option 2: Domain-Specific Providers 🟡 OVER-ENGINEERED

```typescript
<UserContextProvider>
  <OptionListsProvider>
    <DecisionsProvider>
      <App />
    </DecisionsProvider>
  </OptionListsProvider>
</UserContextProvider>
```

**Pros**:
- Clean separation
- Each provider has single responsibility

**Cons**:
- ⚠️ Too much boilerplate for a small app
- ⚠️ Multiple contexts to consume
- ⚠️ Over-engineered for current needs

---

### Option 3: Hybrid (Pragmatic) 🟢 RECOMMENDED

**Principle**: Use providers for shared data, hooks for page-specific logic

```typescript
// Provider for truly shared data
<AppDataProvider>  {/* userContext + optionLists */}
  <App />
</AppDataProvider>

// Page-specific hooks remain
useDecisionsData()  // Decision Queue only
useDecisionVoting() // Decision Queue only
```

**Why This Works**:
- ✅ Solves current problem (option lists sync)
- ✅ Doesn't over-engineer
- ✅ Keeps working patterns (decision hooks)
- ✅ Room to evolve (can add DecisionProvider later if needed)

---

## Recommended Implementation

### Phase 1: Create AppDataProvider (NOW)

**What it provides**:
```typescript
interface AppDataContextType {
  // User & Couple
  userContext: UserContext | null;
  loadingUser: boolean;

  // Option Lists
  optionLists: OptionListWithItems[];
  loadingLists: boolean;
  refreshLists: () => Promise<void>;
  createList: (data, items) => Promise<OptionListWithItems | null>;
  updateList: (id, data, items) => Promise<void>;
  deleteList: (id) => Promise<void>;
}
```

**Usage**:
```typescript
// Decision Queue
const { userContext, optionLists } = useAppData();

// Options Page
const { optionLists, createList, deleteList } = useAppData();

// Settings
const { userContext } = useAppData();
```

**Benefits**:
- Option lists automatically sync ✅
- User context available everywhere ✅
- Single API call for option lists ✅
- No redundant loading ✅

---

### Phase 2: Consider DecisionProvider (LATER - When Building History)

**When History page is built**, if we find we're duplicating decision logic:

```typescript
interface DecisionContextType {
  activeDecisions: Decision[];      // For Decision Queue
  completedDecisions: Decision[];   // For History
  createDecision: (...) => Promise<void>;
  deleteDecision: (id) => Promise<void>;
  // ... etc
}
```

**But NOT needed yet because**:
- Decision Queue has working custom hooks
- History page doesn't exist yet
- Would be premature optimization

---

### Phase 3: Real-time Subscriptions (FUTURE)

Eventually, add real-time for option lists:

```typescript
// In AppDataProvider
useEffect(() => {
  if (!userContext?.coupleId) return;

  const subscription = supabase
    .channel('option_lists_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'option_lists',
      filter: `couple_id=eq.${userContext.coupleId}`
    }, () => {
      refreshLists(); // Auto-update when partner changes lists
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [userContext?.coupleId]);
```

---

## Decision Matrix

| Approach | Solves Current Issue | Maintainable | Right-Sized | Extensible |
|----------|---------------------|--------------|-------------|------------|
| Single Provider | ✅ | ❌ | ❌ | ❌ |
| Multiple Providers | ✅ | ✅ | ❌ | ✅ |
| **Hybrid (Recommended)** | ✅ | ✅ | ✅ | ✅ |

---

## Files to Create

**Phase 1 (Now)**:
1. `/context/app-data-provider.tsx` - AppDataProvider
2. Update `/app/(protected)/_layout.tsx` - Wrap with provider
3. Update `/app/(protected)/(tabs)/index.tsx` - Use context
4. Update `/app/(protected)/(tabs)/options.tsx` - Use context

**Phase 2 (Later - If Needed)**:
- `/context/decision-provider.tsx` - Only if History page duplicates logic

---

## Why NOT a Single Provider for Everything?

**Example of what NOT to do**:
```typescript
// ❌ BAD: Everything in one provider
<GlobalStateProvider>
  decisions={[...]}           // Only needed in Decision Queue
  votes={[...]}               // Only needed in Decision Queue
  optionLists={[...]}         // Needed in 2 places ✅
  userContext={...}           // Needed everywhere ✅
  theme={...}                 // Already has ThemeProvider
  drawer={...}                // Already has DrawerProvider
</GlobalStateProvider>
```

**Problems**:
- Options page imports decisions/votes for no reason
- Everything re-renders when decisions change
- Unclear which data belongs where
- Hard to test individual pieces

---

## Recommendation Summary

### ✅ DO THIS NOW:
1. Create `AppDataProvider` with:
   - User context (global)
   - Option lists (shared)
2. Keep existing decision hooks (page-specific is fine)
3. Use the provider in both Decision Queue and Options

### ⏸️ CONSIDER LATER:
- `DecisionProvider` (only when building History page)
- Real-time subscriptions for option lists
- `UserContextProvider` (only if we call getUserContext everywhere)

### ❌ DON'T DO:
- Single giant provider with all state
- Providers for page-specific data (decisions/votes)
- Over-engineer for future features

---

## Final Answer to Your Question

> "Do we need a decision provider?? What about a global state provider?"

**Answer**:
- **No** decision provider yet (page hooks are working fine)
- **No** single global provider (too much coupling)
- **Yes** to AppDataProvider with just userContext + optionLists (solves current issue, right-sized)

**Reasoning**:
- Small app ✅
- Don't want one context doing too much ✅
- Clarity and standard patterns ✅
- Room to grow ✅

This is the **pragmatic, incremental approach** that solves your immediate problem without over-engineering.
