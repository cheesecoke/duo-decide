import * as React from "react";
import { render, screen, within } from "@testing-library/react-native";

import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * The protected shell's limbo states and its realtime banner
 * (FEATURE-INVENTORY §1.8, §0.6).
 *
 * These three states are the only part of the shell a user can be *stuck* in
 * and none of them had a test — a re-skin that dropped one would look like a
 * blank screen and nothing would have failed.
 *
 * `expo-router` is re-mocked here because the shared `Stack` stub is an object
 * with a `Screen` on it, and this file is the only one that renders `<Stack>`
 * itself.
 */

const mockAuth = {
	initialized: true,
	session: { user: { id: "user-1" } } as unknown,
	isPasswordRecovery: false,
};

const mockUserState: { userContext: unknown; loading: boolean; error: string | null } = {
	userContext: null,
	loading: true,
	error: null,
};

const mockRealtime = { reconnecting: false };

jest.mock("expo-router", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React_ = require("react");
	const Stack = ({ children }: { children?: unknown }) =>
		React_.createElement("Stack", null, children);
	Stack.Screen = ({ name }: { name: string }) => React_.createElement("StackScreen", { name });
	return {
		Stack,
		Redirect: ({ href }: { href: string }) => React_.createElement("Redirect", { href }),
		router: { push: jest.fn(), replace: jest.fn() },
	};
});

/**
 * Defined out here, not inside the factories: babel-plugin-jest-hoist rejects
 * any identifier a factory closes over, type annotations included, unless it
 * is `mock`-prefixed.
 */
const mockPassthrough = ({ children }: { children: React.ReactNode }) => children;

const mockUserContextProvider = ({
	children,
}: {
	children: React.ReactNode | ((state: typeof mockUserState) => React.ReactNode);
}) => (typeof children === "function" ? children(mockUserState) : children);

jest.mock("@/context/supabase-provider", () => ({ useAuth: () => mockAuth }));

jest.mock("@/context/user-context-provider", () => ({
	UserContextProvider: mockUserContextProvider,
}));

jest.mock("@/context/realtime-status-context", () => ({
	RealtimeStatusProvider: mockPassthrough,
	useRealtimeStatus: () => mockRealtime,
}));

jest.mock("@/context/option-lists-provider", () => ({
	OptionListsProvider: mockPassthrough,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProtectedLayout = require("@/app/(protected)/_layout").default;

function renderShell() {
	return render(<ProtectedLayout />, { wrapper: TestWrapper });
}

const ADVICE = "Please try signing out and back in.";

beforeEach(() => {
	jest.clearAllMocks();
	mockAuth.initialized = true;
	mockAuth.isPasswordRecovery = false;
	mockAuth.session = { user: { id: "user-1" } };
	mockUserState.userContext = null;
	mockUserState.loading = true;
	mockUserState.error = null;
	mockRealtime.reconnecting = false;
});

describe("the gates", () => {
	it("renders nothing at all before auth has initialised", () => {
		mockAuth.initialized = false;

		const { toJSON } = renderShell();

		expect(toJSON()).toBeNull();
	});

	it("sends a recovery link to the password screen, and a stranger to welcome", () => {
		mockAuth.isPasswordRecovery = true;
		const recovery = renderShell();
		expect(screen.UNSAFE_getByType("Redirect" as never).props.href).toBe("/reset-password");

		recovery.unmount();

		mockAuth.isPasswordRecovery = false;
		mockAuth.session = null;
		renderShell();
		expect(screen.UNSAFE_getByType("Redirect" as never).props.href).toBe("/welcome");
	});
});

describe("the three limbo states", () => {
	it("waits with a caption, not a card", () => {
		renderShell();

		expect(screen.getByText("Loading…")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
	});

	it("shows the thrown message as the error card's title", () => {
		mockUserState.loading = false;
		mockUserState.error = "Failed to load user data";

		renderShell();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Failed to load user data")).toBeTruthy();
		expect(within(card).getByText(ADVICE)).toBeTruthy();
	});

	it("says so when the context came back empty", () => {
		mockUserState.loading = false;

		renderShell();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Unable to load user data.")).toBeTruthy();
		expect(within(card).getByText(ADVICE)).toBeTruthy();
	});
});

describe("the shell", () => {
	beforeEach(() => {
		mockUserState.loading = false;
		mockUserState.userContext = { coupleId: "couple-1" };
	});

	it("mounts the tab stack once the context is there", () => {
		renderShell();

		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.queryByText("Loading…")).toBeNull();
		expect(screen.UNSAFE_getByType("Stack" as never)).toBeTruthy();
	});

	it("keeps the reconnecting banner out of the way until a channel drops", () => {
		renderShell();

		expect(screen.queryByText("Reconnecting…")).toBeNull();
	});

	it("announces the banner politely while reconnecting", () => {
		mockRealtime.reconnecting = true;

		renderShell();

		const banner = screen.getByText("Reconnecting…");
		expect(banner).toBeTruthy();
		// `role="status"` sits on the bar, so it is announced without interrupting.
		expect(screen.UNSAFE_getByProps({ role: "status" })).toBeTruthy();
	});
});
