# Duo - Couples Decision Making App

## Session Start — Read This First

**Brain/Docs**: `/Users/chasecole/personal-work/duo-docs`

Before working, read:

1. `duo-docs/state/current-status.md` — current phase, what's done, what's pending, key rules

For plans, conversation history, and decision records: see `duo-docs/README.md`

---

## Project Vision

Duo is a couples' decision-making app focused on creating **connection and communication** between partners with different planning styles. It helps free-flowing partners and structured planners make decisions together through a central location that reduces anxiety and builds understanding.

### Core Purpose

- Provide a central hub for couples to make decisions together
- Support different planning styles (spontaneous vs. structured)
- Reduce decision anxiety through clear processes and deadlines
- Build connection through collaborative decision-making

## Tech Stack

- **Framework**: React Native + Expo (mobile-first, web-compatible)
- **Styling**: NativeWind 4 (Tailwind classes on React Native) — `className`,
  never inline styles, and never a hard-coded colour. See **Design System**.
- **Component library**: vendored React Native Reusables under
  `components/ui/reusables/`, restyled on Duo's tokens
- **Motion**: react-native-reanimated 3, durations/springs from `theme/motion.ts`
- **Backend**: Supabase (authentication, database, real-time)
- **Language**: TypeScript
- **State Management**: React Context API
- **Navigation**: Expo Router (file-based routing)
- **Docs/stories**: Storybook 9 (`@storybook/react-native-web-vite`), web only
- **Tests**: Jest + `@testing-library/react-native`

## Project Structure

```
duo-decide/
├── app/                          # Expo Router pages
│   ├── (protected)/              # Authenticated routes
│   │   ├── _layout.tsx           # Shell: auth gates, PersistedPersonPair, banner
│   │   └── (tabs)/
│   │       ├── index.tsx         # Decision Queue (main page)
│   │       ├── options.tsx       # Option Lists management
│   │       └── history.tsx       # Decision history & analytics
│   ├── welcome.tsx               # Landing page
│   ├── sign-in.tsx               # Authentication (six auth screens in all)
│   └── _layout.tsx               # Root layout: fonts, person pair, providers
├── components/
│   ├── ui/reusables/<name>/      # The design system — one folder per piece
│   │   └── <name>.tsx + <name>.stories.tsx + __tests__/<name>.test.tsx
│   ├── layout/                   # The shell and the shared screen chrome
│   │   ├── Header.tsx            # Routing + settings-sheet state
│   │   ├── app-bar.tsx           # The bar itself (pure, has stories)
│   │   ├── settings-sheet.tsx    # The sheet's body (pure, has stories)
│   │   ├── ContentLayout.tsx     # 786 cap + gutters, every screen
│   │   ├── FixedFooter.tsx       # The pinned action row
│   │   ├── ResponsiveCardList.tsx
│   │   └── intro-card.tsx  error-strip.tsx  stagger-in.tsx  footer-pill.tsx
│   ├── decision-queue/           # Queue screen: cards, create form, delete
│   ├── options/                  # Option lists: list cards, editable options
│   ├── history/                  # History rows and the screen's model
│   ├── auth/                     # The auth kit the six auth screens share
│   └── modals/BottomDrawer.tsx   # The sheet every modal surface arrives in
├── theme/                        # The two-hue person system + motion/shadows
│   ├── presets.ts                # The five hues (tokens.md §2)
│   ├── PersonPairProvider.tsx    # Sole writer of the --person-* vars
│   ├── PersonVarsBoundary.tsx    # Re-emits them inside a native Modal
│   ├── PersistedPersonPair.tsx   # The signed-in user's saved pair
│   ├── usePersonColors.ts        # The same colours as *values*
│   └── neutrals.ts  motion.ts  shadows.ts  pair-choice.ts
├── hooks/
│   ├── decision-queue/           # Data, voting and management hooks
│   └── useReducedMotion.ts
├── context/                      # React Context providers
│   ├── drawer-provider.tsx  supabase-provider.tsx
│   └── option-lists-provider.tsx  user-context-provider.tsx
├── tailwind.config.js            # Mirrors design-refs/tokens.md
├── global.css                    # @tailwind + the :root person-var fallbacks
└── assets/icons/                 # Icon components
```

## Key Features

### 1. Decision Queue (Main Flow)

- Collapsible decision cards with expand/collapse
- Shows: Title, Creator, Deadline, Description, Options
- Vote/Poll modes with different behaviors
- Real-time updates when partner votes
- Visual progress indicators

### 2. Voting System

**Simple Vote Mode:**

- Single round selection
- Choose one option
- Immediate completion

**Multi-Round Poll Mode (Phase 4):**

- **Round 1**: All options visible, both partners vote privately
- **Round 2**: Top 50% of options, both partners vote again
- **Round 3**: Top 2 options, ONLY PARTNER votes (creator blocked)
- Privacy: Votes hidden until both partners complete each round
- Progressive elimination reduces decision paralysis

### 3. Option Lists Management

- Create reusable lists of options (dinner ideas, date nights, etc.)
- Inline editing of options
- Collapsible cards matching decision queue pattern
- Use lists when creating decisions

### 4. History & Analytics

- Completed decisions archive
- Stats: Total decisions, who decided more, recent streak
- Decision log with dates and choices

## User Psychology Considerations

### Decision Anxiety Support

- Deadlines provide structure for planners
- Visual progress reduces uncertainty
- Clear completion states provide closure

### Partner Connection

- Shared decision space builds communication
- Poll rounds create thoughtful consideration
- Creator blocking in Round 3 prevents bias
- Privacy controls prevent influence

### Different Planning Styles

- Free-flowing partners can see structure
- Structured planners get their deadlines
- Both feel heard through the process

## Design System

`design-refs/tokens.md` (in the sprint's `design-refs/`) is the source of
truth. `tailwind.config.js` is **derived** from it — edit tokens.md first,
then the config. `theme/neutrals.ts` mirrors the same literals as _values_,
for the handful of props a class cannot reach (react-native-svg `stroke` and
`fill`, gradient colour arrays, Reanimated's `interpolateColor`).

### How to style

Token classes on `className`. Never an inline style for something a class can
do, and **never a hard-coded HSL in a component**. If a token is missing, add
it to `tailwind.config.js` (and note it for tokens.md).

```tsx
<View className="rounded-card bg-surface p-4">
	<Text className="text-row font-medium text-ink-2">Dinner</Text>
</View>
```

- **Neutrals** (§3): `bg`, `surface`, `surface-2`, `ink`, `ink-2`, `ink-3`,
  `line`, `scrim`, `cta`, `cta-fg`, `destructive`, `destructive-tint`
- **Shape** (§4): `rounded-chip`, `rounded-button`, `rounded-card`,
  `rounded-tile`, `rounded-field`, `rounded-sheet`, `rounded-tab-active`
- **Type** (§5): use the `headline` components (`Display`, `Title`, `Body`,
  `Caption`, `Eyebrow`, `Numeral`) rather than respelling sizes; `text-row`
  is the 15/20 list-row size
- **Elevation**: `SHADOW.card` / `SHADOW.float` from `theme/shadows.ts` (no
  class lands a matching shadow on web, iOS and Android at once)

`cn()` from `lib/utils` merges class strings last-one-wins. It is
`extendTailwindMerge`d with Duo's radii and `text-row`, so a new token class
in one of those groups has to be declared there too — an unknown `text-*`
lands in the _colour_ group and gets silently dropped by the next colour.

### The two-hue person system

Duo is a two-person app: person A and person B each own a hue preset
(`theme/presets.ts`: sage, blush, butter, lavender, sky), and the whole theme
derives from the two picks. **Seat convention: the viewer is always A**, their
partner is B — so both people see themselves in the same seat.

The hues reach components down two channels, and one provider writes both:

| need                              | use                                         |
| --------------------------------- | ------------------------------------------- |
| anything NativeWind styles        | `bg-person-a-tint`, `text-person-b-deep`, … |
| a colour as a _value_             | `usePersonColors()` → `person.a.base`       |
| the pair's ids, or to change them | `usePersonPair()` → `{ a, b, setPair }`     |

`PersonPairProvider` is the sole source of both, and is mounted once, at the
root, above the navigator. It is stateless on purpose: `app/_layout.tsx` owns
the pair and `PersistedPersonPair` (in the protected shell) reads and writes
the signed-in user's saved one. Never render `PersonPairContext.Provider`
directly — the two channels would drift.

A native `Modal` portals out of the provider's element on web, so anything
inside a sheet needs `PersonVarsBoundary` above it. `BottomDrawer` already
mounts one.

### Components

Every piece of the system lives at
`components/ui/reusables/<name>/<name>.tsx`, follows the vendored `Button`
pattern (`cva` variants, `cn()` from `lib/utils`, `TextClassContext` where
text sits inside), and ships:

- `<name>.stories.tsx` — **one story per variant AND per state**, rendering in
  `npm run storybook` (web)
- `__tests__/<name>.test.tsx` — behaviour and accessibility, not classes.
  NativeWind's babel preset is off under jest (see `babel.config.js`), so
  class strings are not styled there; assert role,
  `accessibilityState {selected, disabled, checked}` and labels instead.

Shared chrome that is not a primitive: `IntroCard`, `ErrorStrip`,
`StaggerIn` and `FooterPill` in `components/layout/`; `Reveal` (the card's
expand/collapse) is local to `decision-queue/decision-card/decision-card.tsx`.

### Motion

Durations and springs come from `theme/motion.ts` (tokens.md §8), and every
animation is gated on `useReducedMotion()` (`hooks/useReducedMotion.ts`).

**`AnimatedView` rule.** Reanimated's `Animated.View` has no NativeWind
interop registration, so a `className` on it is silently dropped — the layer
animates at zero size in no colour. Use `AnimatedView` from
`components/ui/reusables/animated/animated`, which is registered once with
`cssInterop`. React Native's own `Animated` is banned inside `components/` by
`eslint.config.js`; `BottomDrawer` is the single exception (it is inside a
native `Modal`, where `useNativeDriver` has to stay off on web) and carries
the disable with its reason.

### Component patterns

- **Cards**: `Card` with `state` — the queue's collapsible decision cards
- **Bottom drawers**: `BottomDrawer` for every modal form and creation flow
- **Fixed footer buttons**: `FixedFooter` + `FooterPill`, primary action at
  the bottom
- **Inline editing**: edit-in-place inside the card
- **Circle buttons**: `CircleButton` for icon-only actions

## Current Implementation Status

### ✅ Completed Phases

- **Phase 1-3**: Core UI, decision flow, option management
- **Phase 4**: Multi-round polling system with privacy controls
  - Round progression logic
  - Vote privacy until both complete
  - Option elimination between rounds
  - Creator blocking in Round 3
  - Poll vs Vote differentiation

### 🚧 In Progress

- **Phase 5**: Supabase integration
  - Database schema design
  - Decision queue data connection
  - Voting system backend
  - Real-time updates

### 📋 Upcoming

- Enhanced authentication (couples linking)
- Web-specific UI optimizations
- Calendar date picker for deadlines
- Advanced history features

## Authentication & User Model

### Current State

- Memory-only storage on web (secure but requires re-login)
- Supabase Auth with email/password
- Basic user sessions

### Couples Relationship Model

```typescript
// couples table links partners
{
	id: string;
	user1_id: string; // First partner
	user2_id: string; // Second partner
	created_at: timestamp;
}

// Decisions are shared between couple
{
	id: string;
	creator_id: string; // Who created it
	partner_id: string; // Their partner
	couple_id: string; // Links to couple
	// ... other fields
}
```

## Data Flow & Architecture

### Decision Creation Flow

1. User opens bottom drawer from Decision Queue
2. Enters: Title, Description, Deadline, Vote/Poll type
3. Optionally selects from existing Option Lists
4. Decision created and appears in queue for both partners

### Voting Flow (Vote Mode)

1. User expands decision card
2. Selects one option from list
3. Marks as decided
4. Partner sees decision is complete
5. Moves to history

### Polling Flow (Poll Mode - Phase 4)

1. **Round 1**: Both partners vote privately on all options
2. System calculates top 50% based on votes
3. **Round 2**: Both partners vote on remaining options
4. System identifies top 2 options
5. **Round 3**: ONLY partner votes (creator blocked) on final 2
6. Decision complete, shows in history

## Development Guidelines

### Code Organization

- Small, focused commits
- Mobile-first development
- Type-safe TypeScript
- NativeWind token classes (see **Design System**)
- Consistent naming patterns

### Component Best Practices

- Reuse `components/ui/reusables/` before writing anything new
- Extract common patterns into shared components
- Use token classes, never a hard-coded colour
- Light only for v1 — tokens.md §3 has no dark neutrals, and the person
  presets are picked against a light ground
- Consider web compatibility

### State Management

- Context for global state (person pair, drawer, auth)
- Local state for component-specific logic
- Real-time subscriptions for shared data
- Optimistic updates for responsiveness

## Testing Strategy

### Automated

- `npm test` — the whole Jest suite (husky runs it on every commit)
- `npm run storybook` — stories on web, the only place NativeWind classes are
  actually styled; every new variant and state needs one
- `npm run storybook:build` — static build, the CI/PR gate
- `npx tsc --noEmit` and `npm run lint`

### Manual Testing Focus

- Test as a couple (two separate accounts)
- Verify real-time updates between partners
- Check privacy controls in poll rounds
- Test decision completion flows
- Verify history tracking

### Key Scenarios

- Partner creates decision while I'm viewing queue
- Both partners vote simultaneously in Round 1
- Creator tries to vote in Round 3 (should be blocked)
- Decision moves to history after completion

## Future Improvements

### Authentication

- [ ] HTTP-only cookies for web security
- [ ] Supabase Auth Helpers integration
- [ ] Server-side auth flow evaluation
- [ ] Couples linking/invitation system

### Features

- [ ] Calendar date picker for deadlines
- [ ] Push notifications for partner actions
- [ ] Decision templates
- [ ] Custom option categories
- [ ] Export decision history

### UX Enhancements

- [ ] Animations for round transitions
- [ ] Haptic feedback on mobile
- [ ] Undo decision completion
- [ ] Decision comments/notes

## Known Issues & Limitations

### Current

- Mock data for most features (Phase 5 in progress)
- No push notifications yet
- Web UI needs responsive polish
- No offline support

### Technical Debt

- Some unused icon files
- `lib/database.ts` carries most of the repo's remaining `tsc` errors
- `@rn-primitives/{label,radio-group,switch,types}` are no longer imported by
  anything (the v1 components that used them are gone) and can be dropped
- Need to standardize all TypeScript interfaces

## Working with This Codebase

### Getting Started

1. Clone repo
2. `npm install`
3. Set up Supabase project and add env variables
4. `npm run dev` for development

### Key Commands

- `npx expo start` - Start Expo
- `npm run web` - Web development
- `npm run ios` - iOS simulator
- `npm run android` - Android emulator
- `npm run build` - `expo export --platform web`
- `npm test` / `npm run test:watch` - Jest
- `npm run storybook` / `npm run storybook:build` - Storybook (web)
- `npm run lint` - ESLint + Prettier

### Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Contributing

### Commit Message Format

- `feat: add new feature`
- `fix: resolve bug`
- `ui: update styling/layout`
- `refactor: restructure code`
- `docs: update documentation`

### Branch Strategy

- `main` - production ready
- Feature branches for new work
- Small, focused PRs

## Resources

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reusables](https://reactnativereusables.com)
- [Supabase Docs](https://supabase.com/docs)
- [React Native](https://reactnative.dev/)
- Style with NativeWind token classes, not inline styles — the exceptions are
  the ones the Design System section names (SVG props, gradients, shadows,
  animated values).
- Be mindful of Supabase request limiting when running scripts against the
  live project.
