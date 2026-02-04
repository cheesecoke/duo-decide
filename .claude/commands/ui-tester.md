# UI Tester Agent

Test React Native components for rendering and interactions in the Duo app.

## Instructions

1. Read the component file completely
2. Identify all props and their effects on rendering
3. Write tests covering:
   - Renders correctly with default props
   - All prop variations render correctly
   - User interactions trigger appropriate callbacks
   - Conditional rendering works as expected
   - Accessibility labels are present

## Test Pattern

Use @testing-library/react-native with the TestWrapper:

```typescript
import { render, fireEvent, screen } from "@testing-library/react-native";
import { createWrapper } from "@/test-utils/test-wrapper";
import { ComponentToTest } from "@/components/path/to/component";

describe("ComponentName", () => {
  it("should render correctly", () => {
    render(<ComponentToTest />, { wrapper: createWrapper() });

    expect(screen.getByText("Expected Text")).toBeTruthy();
  });

  it("should handle user interaction", () => {
    const onPress = jest.fn();
    render(<ComponentToTest onPress={onPress} />, { wrapper: createWrapper() });

    fireEvent.press(screen.getByText("Button Text"));

    expect(onPress).toHaveBeenCalled();
  });
});
```

## Key Components to Test

### High Priority
- `components/ui/CollapsibleCard/CollapsibleCard.tsx` - Main card component
- `components/decision-queue/CreateDecisionForm.tsx` - Decision creation form
- `components/ui/CollapsibleCard/VotingStatusIndicator.tsx` - Voting progress display
- `components/ui/CollapsibleCard/DecisionDecideButton.tsx` - Vote/poll action button

### Medium Priority
- `components/ui/Button/Button.tsx` - Base button component
- `components/ui/EditableOptionsList.tsx` - Option list management
- `components/layout/Header.tsx` - App header

## Test Categories

### 1. Render Tests
```typescript
it("should render with required props", () => {
  render(<Component requiredProp="value" />);
  expect(screen.getByTestId("component-id")).toBeTruthy();
});
```

### 2. Prop Variation Tests
```typescript
describe("when expanded", () => {
  it("should show additional content", () => {
    render(<CollapsibleCard expanded={true} />);
    expect(screen.getByTestId("expanded-content")).toBeTruthy();
  });
});
```

### 3. Interaction Tests
```typescript
it("should call onExpand when tapped", () => {
  const onExpand = jest.fn();
  render(<CollapsibleCard onExpand={onExpand} />);

  fireEvent.press(screen.getByTestId("card-header"));

  expect(onExpand).toHaveBeenCalledTimes(1);
});
```

### 4. Conditional Rendering Tests
```typescript
it("should show error message when error prop is provided", () => {
  render(<Form error="Invalid input" />);
  expect(screen.getByText("Invalid input")).toBeTruthy();
});

it("should not show error when error prop is undefined", () => {
  render(<Form />);
  expect(screen.queryByText("Invalid input")).toBeNull();
});
```

## Mocking Patterns

### Mock Navigation
```typescript
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
```

### Mock Theme
The TestWrapper already provides ThemeProvider, but you can mock specific theme values:

```typescript
jest.mock("@/context/theme-provider", () => ({
  useTheme: () => ({
    theme: { colors: { primary: "#000" } },
    toggleTheme: jest.fn(),
  }),
}));
```

## Output

Complete test file with:
- All necessary imports and mocks
- Organized describe blocks by functionality
- Comprehensive prop coverage
- Interaction tests for all user actions
