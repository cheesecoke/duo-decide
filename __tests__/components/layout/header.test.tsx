import * as React from "react";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { usePathname } from "expo-router";

import { Text } from "react-native";

/**
 * The global header (FEATURE-INVENTORY §0.2).
 *
 * Two things are asserted here and nowhere else: the right slot's
 * mutually-exclusive rule, and that the settings sheet the header pushes into
 * the drawer is the *live* one — `updateContent` re-renders it as the header's
 * own state changes, which is what makes the drawer a content slot rather
 * than a screen.
 *
 * The drawer provider is the real one (it is a `useState` and nothing else),
 * so `showDrawer` / `updateContent` are exercised rather than counted. Auth
 * and the database are mocked: they reach Supabase, which has no client here.
 */

const mockAuth = { signOut: jest.fn(() => Promise.resolve()) };
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

jest.mock("@/context/theme-provider", () => ({
	useTheme: () => ({ colorMode: "light", toggleColorMode: jest.fn() }),
}));

const mockDatabase = {
	getUserContext: jest.fn(() => Promise.resolve(null)),
	invitePartner: jest.fn(() => Promise.resolve({ error: null })),
	cancelPartnerInvitation: jest.fn(() => Promise.resolve({ error: null })),
};
jest.mock("@/lib/database", () => mockDatabase);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useRouter } = require("expo-router");
(useRouter as jest.Mock).mockImplementation(() => mockRouter);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Header = require("@/components/layout/Header").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DrawerProvider, useDrawer } = require("@/context/drawer-provider");

/** Renders whatever the header pushed into the drawer, live. */
function DrawerSlot() {
	const { content } = useDrawer();
	return <>{content}</>;
}

type HeaderProps = {
	showBackButton?: boolean;
	navButton?: React.ReactNode;
	userContext?: unknown;
};

async function renderHeader(props: HeaderProps = {}) {
	const view = render(
		<DrawerProvider>
			<Header {...props} />
			<DrawerSlot />
		</DrawerProvider>,
	);
	// `getUserContext()` is a promise even when it resolves to null.
	await act(async () => {});
	return view;
}

beforeEach(() => {
	(usePathname as jest.Mock).mockReturnValue("/");
	mockDatabase.getUserContext.mockResolvedValue(null);
});

describe("the right slot (inventory §0.2)", () => {
	it("shows the settings circle on the index route", async () => {
		await renderHeader();

		expect(screen.getByLabelText("Settings")).toBeTruthy();
		expect(screen.queryByLabelText("Back")).toBeNull();
	});

	it("shows back instead, off the index route", async () => {
		(usePathname as jest.Mock).mockReturnValue("/history");

		await renderHeader({ showBackButton: true });

		expect(screen.getByLabelText("Back")).toBeTruthy();
		expect(screen.queryByLabelText("Settings")).toBeNull();
	});

	it("lets a screen's own navButton beat both", async () => {
		(usePathname as jest.Mock).mockReturnValue("/");

		await renderHeader({
			showBackButton: true,
			navButton: <Text>Done</Text>,
		});

		expect(screen.getByText("Done")).toBeTruthy();
		expect(screen.queryByLabelText("Settings")).toBeNull();
		expect(screen.queryByLabelText("Back")).toBeNull();
	});

	it("shows nothing on the right when there is nothing to show", async () => {
		(usePathname as jest.Mock).mockReturnValue("/sign-in");

		await renderHeader({ showBackButton: false });

		expect(screen.queryByLabelText("Settings")).toBeNull();
		expect(screen.queryByLabelText("Back")).toBeNull();
	});
});

describe("the settings sheet (inventory §0.2)", () => {
	const noPartner = {
		userId: "user-1",
		userName: "Chase",
		coupleId: "couple-1",
		partnerId: null,
		partnerName: null,
	};

	it("opens into the drawer, titled Settings", async () => {
		await renderHeader({ userContext: noPartner });

		await userEvent.press(screen.getByLabelText("Settings"));

		expect(screen.getByText("⚠️ No partner linked")).toBeTruthy();
		expect(screen.getByLabelText("Invite Partner")).toBeTruthy();
	});

	it("re-renders the open sheet as the header's own state changes", async () => {
		await renderHeader({ userContext: noPartner });
		await userEvent.press(screen.getByLabelText("Settings"));

		// The field is the header's state, pushed back through `updateContent`.
		fireEvent.changeText(screen.getByLabelText("Partner's email"), "sam@example.com");

		expect(screen.getByLabelText("Partner's email").props.value).toBe("sam@example.com");
		expect(screen.getByLabelText("Invite Partner").props.accessibilityState).toMatchObject({
			disabled: false,
		});
	});

	it("refuses an address that is not one, without calling the database", async () => {
		await renderHeader({ userContext: noPartner });
		await userEvent.press(screen.getByLabelText("Settings"));

		fireEvent.changeText(screen.getByLabelText("Partner's email"), "sam@example");
		await act(async () => {
			fireEvent.press(screen.getByLabelText("Invite Partner"));
		});

		expect(screen.getByText("Please enter a valid email address")).toBeTruthy();
		expect(mockDatabase.invitePartner).not.toHaveBeenCalled();
	});

	it("sends a real address", async () => {
		await renderHeader({ userContext: noPartner });
		await userEvent.press(screen.getByLabelText("Settings"));

		fireEvent.changeText(screen.getByLabelText("Partner's email"), "sam@example.com");
		await act(async () => {
			fireEvent.press(screen.getByLabelText("Invite Partner"));
		});

		expect(mockDatabase.invitePartner).toHaveBeenCalledWith("user-1", "sam@example.com");
	});

	it("signs out and lands on welcome", async () => {
		await renderHeader({ userContext: noPartner });
		await userEvent.press(screen.getByLabelText("Settings"));

		await act(async () => {
			fireEvent.press(screen.getByLabelText("Sign out"));
		});

		expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
		expect(mockRouter.replace).toHaveBeenCalledWith("/welcome");
	});

	it("routes to change password", async () => {
		await renderHeader({ userContext: noPartner });
		await userEvent.press(screen.getByLabelText("Settings"));

		await userEvent.press(screen.getByLabelText("Change password"));

		expect(mockRouter.push).toHaveBeenCalledWith("/change-password");
	});
});

describe("the brand", () => {
	it("always renders the wordmark", async () => {
		await renderHeader();

		expect(screen.getByText("Duo")).toBeTruthy();
		expect(screen.getByTestId("brand-heart")).toBeTruthy();
	});
});
