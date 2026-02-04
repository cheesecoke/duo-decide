# E2E Test Writer Agent (Maestro)

Write Maestro E2E tests for user flows in the Duo app.

## Maestro Basics

Maestro is a mobile UI testing framework that uses YAML for test definitions.

### Installation
```bash
# macOS
brew install maestro

# Run tests
maestro test e2e/flow-name.yaml
```

### Basic Commands
```yaml
# Launch the app
- launchApp

# Tap on element by text
- tapOn: "Button Text"

# Tap on element by ID
- tapOn:
    id: "button-id"

# Enter text
- inputText: "hello@example.com"

# Scroll
- scroll

# Assert element is visible
- assertVisible: "Expected Text"

# Assert element is NOT visible
- assertNotVisible: "Error Message"

# Wait for element
- extendedWaitUntil:
    visible: "Loading complete"
    timeout: 10000
```

## Test Template

```yaml
appId: com.duodecide.app
---
# Test name and description in comments
# Flow: [Description of what this test covers]

- launchApp

# Step 1: Description
- tapOn: "Element"

# Step 2: Description
- inputText: "value"

# Verify result
- assertVisible: "Success"
```

## Key Flows to Test

### 1. Auth Flow (`e2e/auth-flow.yaml`)
```yaml
appId: com.duodecide.app
---
# Auth Flow: Sign up and partner invitation

# Start at welcome screen
- launchApp
- assertVisible: "Welcome to Duo"

# Navigate to sign up
- tapOn: "Create Account"

# Fill sign up form
- tapOn:
    id: "email-input"
- inputText: "newuser@example.com"

- tapOn:
    id: "password-input"
- inputText: "SecurePass123!"

- tapOn: "Sign Up"

# Wait for navigation to partner setup
- extendedWaitUntil:
    visible: "Invite Your Partner"
    timeout: 10000

# Enter partner email
- tapOn:
    id: "partner-email-input"
- inputText: "partner@example.com"

- tapOn: "Send Invitation"

# Verify success
- assertVisible: "Invitation Sent"
```

### 2. Vote Mode Flow (`e2e/vote-mode.yaml`)
```yaml
appId: com.duodecide.app
---
# Vote Mode: Create decision and vote

# Prerequisites: User is logged in with partner connected

- launchApp
- assertVisible: "Decision Queue"

# Create new decision
- tapOn: "+"

# Fill decision form
- tapOn:
    id: "decision-title-input"
- inputText: "Dinner Tonight"

- tapOn:
    id: "decision-description-input"
- inputText: "Where should we eat?"

# Add options
- tapOn: "Add Option"
- inputText: "Italian"

- tapOn: "Add Option"
- inputText: "Sushi"

# Select vote mode (default)
- assertVisible: "Vote"

# Create decision
- tapOn: "Create Decision"

# Wait for decision to appear
- extendedWaitUntil:
    visible: "Dinner Tonight"
    timeout: 5000

# Expand decision
- tapOn: "Dinner Tonight"

# Vote for an option
- tapOn: "Italian"
- tapOn: "Submit Vote"

# Verify voted status
- assertVisible: "Waiting for partner"
```

### 3. Poll Mode Flow (`e2e/poll-mode.yaml`)
```yaml
appId: com.duodecide.app
---
# Poll Mode: Multi-round voting

- launchApp
- assertVisible: "Decision Queue"

# Create poll decision
- tapOn: "+"

- tapOn:
    id: "decision-title-input"
- inputText: "Movie Night"

# Switch to poll mode
- tapOn: "Poll"

# Add 4 options (required for 3 rounds)
- tapOn: "Add Option"
- inputText: "Action"

- tapOn: "Add Option"
- inputText: "Comedy"

- tapOn: "Add Option"
- inputText: "Drama"

- tapOn: "Add Option"
- inputText: "Thriller"

- tapOn: "Create Decision"

# Expand and verify poll mode
- tapOn: "Movie Night"
- assertVisible: "Round 1"
- assertVisible: "Action"
- assertVisible: "Comedy"
- assertVisible: "Drama"
- assertVisible: "Thriller"

# Vote in Round 1
- tapOn: "Action"
- tapOn: "Submit Vote"

# Verify waiting state
- assertVisible: "Waiting for partner"
```

## Test Organization

```
e2e/
├── auth-flow.yaml        # Sign up, sign in, partner setup
├── vote-mode.yaml        # Simple vote flow
├── poll-mode.yaml        # Multi-round poll flow
├── option-lists.yaml     # Option list CRUD
├── history.yaml          # History page and stats
└── edge-cases.yaml       # Error handling, edge cases
```

## Best Practices

1. **One flow per file**: Keep tests focused
2. **Add comments**: Explain each step
3. **Use IDs**: Prefer `id` over text matching when possible
4. **Wait appropriately**: Use `extendedWaitUntil` for async operations
5. **Clean state**: Each test should start from a known state

## Running Tests

```bash
# Run single test
maestro test e2e/auth-flow.yaml

# Run all tests
maestro test e2e/

# Run with verbose output
maestro test e2e/auth-flow.yaml --debug-output

# Record test execution
maestro record e2e/auth-flow.yaml
```

## Debugging

```yaml
# Take screenshot
- takeScreenshot: "step-name"

# Print debug info
- runScript:
    script: console.log("Debug message")

# Pause for manual inspection (remove in CI)
- tapOn: "__skip__"
```
