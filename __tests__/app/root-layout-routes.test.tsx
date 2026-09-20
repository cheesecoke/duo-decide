import * as React from "react";
import { render, screen, within } from "@testing-library/react-native";

/**
 * `app/_layout.tsx` — the per-route options table and the provider order.
 *
 * Both are on the PLAN-3 final review's "top five untested risks" list (1 and
 * 2), and for the same reason: they are configuration, so nothing renders
 * differently when one of them is wrong. A `presentation` that stopped saying
 * "modal", or a `gestureEnabled` that came back on the reset-password screen,
 * would pass every other test in this repo — and the second one is a real
 * hole, not a cosmetic one: reset-password is reached from an email link with
 * a recovery session live, and a back swipe out of it leaves the user in a
 * half-authenticated state with no way back to the form.
 *
 * The whole file is mocked down to the two things under test. `Stack.Screen`
 * records its props instead of rendering, and each provider renders a host
 * element with a testID so the nesting can be read off the tree.
 *
 * **Nesting is asserted by rendering, not by import order.** It is the
 * cheaper of the two honest options here — the mocks were needed for the
 * routes table anyway — and it is the one that actually answers the question:
 * import order says nothing about which element wraps which.
 */

/* ------------------------------------------------------------------ mocks - */

// Recorded per render so the table can be read without walking the tree.
const mockScreens: { name: string; options: Record<string, unknown> }[] = [];

jest.mock("expo-router", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React_ = require("react");
	const Stack = ({ children }: { children?: unknown }) =>
		React_.createElement("View", { testID: "stack" }, children);
	function Screen({ name, options }: { name: string; options?: Record<string, unknown> }) {
		mockScreens.push({ name, options: options ?? {} });
		return null;
	}
	Screen.displayName = "Stack.Screen";
	Stack.Screen = Screen;
	return { Stack };
});

// The layout returns null until the fonts land, so they land.
jest.mock("expo-font", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/plus-jakarta-sans", () => ({
	PlusJakartaSans_400Regular: "PlusJakartaSans_400Regular",
	PlusJakartaSans_500Medium: "PlusJakartaSans_500Medium",
	PlusJakartaSans_600SemiBold: "PlusJakartaSans_600SemiBold",
	PlusJakartaSans_700Bold: "PlusJakartaSans_700Bold",
	PlusJakartaSans_800ExtraBold: "PlusJakartaSans_800ExtraBold",
}));
jest.mock("@expo-google-fonts/outfit", () => ({ Outfit_600SemiBold: "Outfit_600SemiBold" }));

// Not a stylesheet jest can parse, and nothing here looks at it.
jest.mock("../../global.css", () => ({}), { virtual: true });

/**
 * One shape for every provider mock: a host element carrying a testID, with
 * its children inside it. That is what makes `within(outer).getByTestId(inner)`
 * mean "outer wraps inner".
 */
function mockLayer(testID: string) {
	function Layer({ children }: { children?: React.ReactNode }) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const React_ = require("react");
		return React_.createElement("View", { testID }, children);
	}
	Layer.displayName = `mock:${testID}`;
	return Layer;
}

jest.mock("@react-navigation/native", () => ({
	ThemeProvider: mockLayer("nav-theme"),
	DefaultTheme: { colors: {} },
}));
jest.mock("@/context/supabase-provider", () => ({ AuthProvider: mockLayer("auth") }));
jest.mock("@/context/drawer-provider", () => ({ DrawerProvider: mockLayer("drawer") }));
jest.mock("@/theme/PersonPairProvider", () => ({ PersonPairProvider: mockLayer("person-pair") }));
jest.mock("@/components/layout/Header", () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppLayout = require("@/app/_layout").default;

/** The options the layout declared for one route name. */
function optionsFor(name: string): Record<string, unknown> {
	const screen = mockScreens.find((entry) => entry.name === name);
	if (!screen) throw new Error(`no <Stack.Screen name="${name}"> was rendered`);
	return screen.options;
}

beforeEach(() => {
	mockScreens.length = 0;
	render(<AppLayout />);
});

/* ------------------------------------------------------------------ tests - */

describe("app/_layout — the route options table", () => {
	it("declares every route the app has, once each", () => {
		expect(mockScreens.map((entry) => entry.name)).toEqual([
			"welcome",
			"sign-up",
			"sign-in",
			"forgot-password",
			"reset-password",
			"change-password",
			"(protected)",
		]);
	});

	/**
	 * The one route with no way out but finishing it. It is opened from an
	 * email link with a recovery session live: a back button or a back swipe
	 * would leave the user signed in to nothing, on whatever screen is under
	 * it, with no route back to the form.
	 */
	it("pins reset-password: a header with no back button, and no gesture", () => {
		expect(optionsFor("reset-password")).toMatchObject({
			headerShown: true,
			headerProps: { showBackButton: false },
			gestureEnabled: false,
		});
		// Not a modal either — a modal is dismissible by definition.
		expect(optionsFor("reset-password").presentation).toBeUndefined();
	});

	it.each(["sign-up", "sign-in", "forgot-password", "change-password"])(
		"%s is a modal you can back out of",
		(name) => {
			expect(optionsFor(name)).toMatchObject({
				presentation: "modal",
				headerShown: true,
				headerProps: { showBackButton: true },
				gestureEnabled: true,
			});
		},
	);

	it("gives welcome no header at all", () => {
		expect(optionsFor("welcome")).toMatchObject({ headerShown: false });
		expect(optionsFor("welcome").presentation).toBeUndefined();
	});

	it("keeps the protected shell transparent so it can paint its own bg", () => {
		expect(optionsFor("(protected)")).toMatchObject({
			headerShown: true,
			headerProps: { showBackButton: true },
			contentStyle: { backgroundColor: "transparent" },
		});
	});
});

describe("app/_layout — provider order", () => {
	/**
	 * `PersonPairProvider` is the sole writer of the `--person-*` vars and of
	 * the context (CLAUDE.md, "The two-hue person system"), so it has to sit
	 * above the navigator: a hue change has to re-theme every screen, the
	 * header and the drawer at once. Anything below `<Stack>` would re-theme
	 * one screen.
	 *
	 * It is above the navigation `ThemeProvider` as well, not inside it. The
	 * two are unrelated — the nav theme is a constant `LightNavTheme` that
	 * paints the navigator's own background — so the order between them is
	 * free; what is not free is that both are above `<Stack>`.
	 */
	it("puts the person pair outermost, and the navigator innermost", () => {
		const pair = screen.getByTestId("person-pair");
		const navTheme = within(pair).getByTestId("nav-theme");
		const auth = within(navTheme).getByTestId("auth");
		const drawer = within(auth).getByTestId("drawer");

		expect(within(drawer).getByTestId("stack")).toBeTruthy();
	});

	it("mounts exactly one of each", () => {
		expect(screen.getAllByTestId("person-pair")).toHaveLength(1);
		expect(screen.getAllByTestId("auth")).toHaveLength(1);
		expect(screen.getAllByTestId("drawer")).toHaveLength(1);
		expect(screen.getAllByTestId("stack")).toHaveLength(1);
	});
});
