// Jest setup file for Duo app tests

// Mock React Native with enough surface area to support component render tests.
// The real react-native is not runnable under this jest environment (it ships
// untranspiled Flow and reaches for a native bridge), so every component and
// API the tree touches has to be stood up here — a missing one is an
// undefined element type, not a helpful error. Each mock forwards props so
// queries like getByLabelText and assertions on role / accessibilityState see
// them on the host node.
// Note: jest.mock factories cannot reference out-of-scope variables; use
// require() inside the factory to access modules like React.
jest.mock("react-native", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require("react");

	// Props are forwarded, not dropped: queries like getByLabelText and any
	// assertion on role / accessibilityState need them to reach the host node.
	function MockView({ children, ...rest }: { children?: unknown; [key: string]: unknown }) {
		return React.createElement("View", rest, children);
	}
	MockView.displayName = "View";

	function MockText({ children, ...rest }: { children?: unknown; [key: string]: unknown }) {
		return React.createElement("Text", rest, children);
	}
	MockText.displayName = "Text";

	function MockPressable({
		children,
		onPress,
		disabled,
		...rest
	}: {
		children?: unknown;
		onPress?: () => void;
		disabled?: boolean;
		[key: string]: unknown;
	}) {
		// The real Pressable drops presses while disabled; without this the
		// mock happily fires them and "disabled does nothing" tests pass by
		// accident.
		return React.createElement(
			"Pressable",
			{ onPress: disabled ? undefined : onPress, disabled, ...rest },
			children,
		);
	}
	MockPressable.displayName = "Pressable";

	function MockScrollView({ children, ...rest }: { children?: unknown; [key: string]: unknown }) {
		return React.createElement("ScrollView", rest, children);
	}
	MockScrollView.displayName = "ScrollView";

	// `ContentLayout` wraps every screen in one; it is a View with insets, and
	// insets are not a thing any test asserts.
	function MockSafeAreaView({ children, ...rest }: { children?: unknown; [key: string]: unknown }) {
		return React.createElement("SafeAreaView", rest, children);
	}
	MockSafeAreaView.displayName = "SafeAreaView";

	function MockTextInput(props: { [key: string]: unknown }) {
		return React.createElement("TextInput", props);
	}
	MockTextInput.displayName = "TextInput";

	function MockActivityIndicator() {
		return React.createElement("ActivityIndicator", null);
	}
	MockActivityIndicator.displayName = "ActivityIndicator";

	// `BottomDrawer` is a native Modal. The real one renders nothing while
	// `visible` is false, which is the only part of it any test depends on.
	function MockModal({
		children,
		visible,
		...rest
	}: {
		children?: unknown;
		visible?: boolean;
		[key: string]: unknown;
	}) {
		if (visible === false) return null;
		return React.createElement("Modal", { visible, ...rest }, children);
	}
	MockModal.displayName = "Modal";

	// React Native's own Animated. Its drivers settle through setTimeout, so a
	// close animation can be advanced with fake timers — see animated-mock.ts.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const MockAnimated = require("./animated-mock").createAnimatedMock({
		View: MockView,
		Text: MockText,
		ScrollView: MockScrollView,
	});

	function MockTouchableOpacity({
		children,
		onPress,
		...rest
	}: {
		children?: unknown;
		onPress?: () => void;
		[key: string]: unknown;
	}) {
		return React.createElement("TouchableOpacity", { onClick: onPress, ...rest }, children);
	}
	MockTouchableOpacity.displayName = "TouchableOpacity";

	return {
		Platform: {
			OS: "ios",
			select: jest.fn((obj: Record<string, unknown>) => obj.ios || obj.default),
		},
		AccessibilityInfo: {
			isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
			addEventListener: jest.fn(() => ({ remove: jest.fn() })),
		},
		AppState: {
			addEventListener: jest.fn(),
		},
		// NativeWind's runtime reads the colour scheme when `vars()` is first
		// called (theme/PersonPairProvider).
		Appearance: {
			getColorScheme: jest.fn(() => "light"),
			addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
		},
		Dimensions: {
			get: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
			addEventListener: jest.fn(() => ({ remove: jest.fn() })),
		},
		PixelRatio: {
			get: jest.fn(() => 3),
			getFontScale: jest.fn(() => 1),
			roundToNearestPixel: jest.fn((n: number) => n),
		},
		StyleSheet: {
			create: (styles: Record<string, unknown>) => styles,
			flatten: jest.fn(),
		},
		// `ResponsiveCardList` reads the window to decide list vs. masonry. A
		// plain function rather than a jest.fn: nothing asserts the calls, and a
		// stale mock implementation here would break every screen render.
		useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
		View: MockView,
		Text: MockText,
		SafeAreaView: MockSafeAreaView,
		ScrollView: MockScrollView,
		TextInput: MockTextInput,
		Pressable: MockPressable,
		ActivityIndicator: MockActivityIndicator,
		TouchableOpacity: MockTouchableOpacity,
		Modal: MockModal,
		Animated: MockAnimated,
	};
});

// Mock Expo modules
jest.mock("expo-secure-store", () => ({
	setItemAsync: jest.fn(() => Promise.resolve()),
	getItemAsync: jest.fn(() => Promise.resolve(null)),
	deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-linking", () => ({
	createURL: jest.fn((path: string) => `exp://localhost/${path}`),
	openURL: jest.fn(() => Promise.resolve()),
	getInitialURL: jest.fn(() => Promise.resolve(null)),
	addEventListener: jest.fn(() => ({ remove: jest.fn() })),
	useURL: jest.fn(() => null),
}));

jest.mock("expo-router", () => ({
	// The imperative router, for screens that navigate outside a hook.
	router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() },
	useRouter: jest.fn(() => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
		navigate: jest.fn(),
	})),
	useSegments: jest.fn(() => []),
	usePathname: jest.fn(() => "/"),
	SplashScreen: {
		preventAutoHideAsync: jest.fn(() => Promise.resolve()),
		hideAsync: jest.fn(() => Promise.resolve()),
	},
	Redirect: jest.fn(() => null),
	Stack: { Screen: jest.fn(() => null) },
	Tabs: { Screen: jest.fn(() => null) },
	Link: jest.fn(({ children }: { children: unknown }) => children),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
	setItem: jest.fn(() => Promise.resolve()),
	getItem: jest.fn(() => Promise.resolve(null)),
	removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-get-random-values
jest.mock("react-native-get-random-values", () => ({}));

// react-native-svg reaches for react-native internals the mock above does not
// have (Touchable.Mixin, processColor, requireNativeComponent) and throws at
// import time. Swap in host elements that keep the drawing props visible.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-svg", () => require("./react-native-svg-mock").createSvgMock());

// expo-linear-gradient calls react-native's `processColor` at render time,
// which the react-native mock above does not provide. Gradients are a visual
// concern; swap in a host element that still carries the props.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("expo-linear-gradient", () => require("./expo-linear-gradient-mock"));

// Reanimated reaches for its native TurboModule at import time, which the
// react-native mock above cannot satisfy, and its babel plugin is off in jest.
// Swap in a no-op implementation; motion is exercised in Storybook instead.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("react-native-reanimated", () => require("./reanimated-mock").createReanimatedMock());

// Mock Supabase client (require needed for jest.mock callback)
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("@/config/supabase", () => require("./supabase-mock").mockSupabase);

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();
});
