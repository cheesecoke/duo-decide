import * as React from "react";
import { act, render, screen } from "@testing-library/react-native";
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

describe("the brand", () => {
	it("always renders the wordmark", async () => {
		await renderHeader();

		expect(screen.getByText("Duo")).toBeTruthy();
		expect(screen.getByTestId("brand-heart")).toBeTruthy();
	});
});
