# Duo - Couples Decision Making App

## Project Vision

Duo is a couples' decision-making app focused on creating **connection and communication** between partners with different planning styles. It helps free-flowing partners and structured planners make decisions together through a central location that reduces anxiety and builds understanding.

### Core Purpose
- Provide a central hub for couples to make decisions together
- Support different planning styles (spontaneous vs. structured)
- Reduce decision anxiety through clear processes and deadlines
- Build connection through collaborative decision-making

## Tech Stack

- **Framework**: React Native + Expo (mobile-first, web-compatible)
- **Styling**: Emotion Native with custom theme system
- **Backend**: Supabase (authentication, database, real-time)
- **Language**: TypeScript
- **State Management**: React Context API
- **Navigation**: Expo Router (file-based routing)

## Project Structure

```
duo-decide/
├── app/                        # Expo Router pages
│   ├── (protected)/           # Authenticated routes
│   │   └── (tabs)/           # Tab navigation
│   │       ├── index.tsx     # Decision Queue (main page)
│   │       ├── options.tsx   # Option Lists management
│   │       └── history.tsx   # Decision history & analytics
│   ├── welcome.tsx           # Landing page
│   ├── sign-in.tsx          # Authentication
│   └── _layout.tsx          # Root layout with providers
├── components/
│   ├── layout/              # Layout components
│   │   ├── Header.tsx       # Global header with menu
│   │   ├── CollapsibleCard.tsx  # Decision cards
│   │   └── ContentLayout.tsx
│   ├── ui/                  # Reusable UI components
│   │   ├── EditableOptionsList.tsx
│   │   ├── CollapsibleListCard.tsx
│   │   └── Button/
├── context/                 # React Context providers
│   ├── theme-provider.tsx
│   ├── drawer-provider.tsx
│   └── supabase-provider.tsx
└── assets/icons/           # Icon components
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

### Theme Structure
```typescript
// Color modes: light/dark
// Key colors:
- yellow: Primary accent (#F59E0B)
- yellowForeground: Text on yellow
- foreground: Primary text
- mutedForeground: Secondary text
- card: Card backgrounds
- border: Dividers and borders

// Round indicators (Phase 4):
- round1: Round 1 indicator color
- round2: Round 2 indicator color
- round3: Round 3 indicator color
- success: Completion/success state
```

### Component Patterns
- **Collapsible Cards**: Standard pattern for lists
- **Bottom Drawers**: Modal forms and creation flows
- **Fixed Footer Buttons**: Primary actions at bottom
- **Inline Editing**: Edit-in-place with pencil/check icons
- **Circle Buttons**: Icon-only actions (delete, expand, etc.)

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
  id: string
  user1_id: string  // First partner
  user2_id: string  // Second partner
  created_at: timestamp
}

// Decisions are shared between couple
{
  id: string
  creator_id: string    // Who created it
  partner_id: string    // Their partner
  couple_id: string     // Links to couple
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
- Emotion styled components
- Consistent naming patterns

### Component Best Practices
- Reuse existing components where possible
- Extract common patterns into shared components
- Use theme colors, never hardcoded
- Support both light/dark modes
- Consider web compatibility

### State Management
- Context for global state (theme, drawer, auth)
- Local state for component-specific logic
- Real-time subscriptions for shared data
- Optimistic updates for responsiveness

## Testing Strategy

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
- FloatingNav code removed but files remain
- Need to standardize all TypeScript interfaces

## Working with This Codebase

### Getting Started
1. Clone repo
2. `npm install`
3. Set up Supabase project and add env variables
4. `npm run dev` for development

### Key Commands
- `npm run dev` - Start dev server
- `npx expo start` - Start Expo
- `npm run web` - Web development
- `npm run ios` - iOS simulator
- `npm run android` - Android emulator

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
- [Emotion Styling](https://emotion.sh/docs/introduction)
- [Supabase Docs](https://supabase.com/docs)
- [React Native](https://reactnative.dev/)
