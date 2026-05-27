// Jest setup file for Duo app tests

// Mock React Native with enough surface area to support component render tests.
// Emotion Native calls styled(Pressable) etc. at module-load time, so all
// components used in styled() calls must be defined here.
// Note: jest.mock factories cannot reference out-of-scope variables; use
// require() inside the factory to access modules like React.
jest.mock("react-native", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require("react");

	function MockView({ children }: { children?: unknown }) {
		return React.createElement("View", null, children);
	}
	MockView.displayName = "View";

	function MockText({ children }: { children?: unknown }) {
		return React.createElement("Text", null, children);
	}
	MockText.displayName = "Text";

	function MockPressable({
		children,
		onPress,
		...rest
	}: {
		children?: unknown;
		onPress?: () => void;
		[key: string]: unknown;
	}) {
		return React.createElement("Pressable", { onPress, ...rest }, children);
	}
	MockPressable.displayName = "Pressable";

	function MockActivityIndicator() {
		return React.createElement("ActivityIndicator", null);
	}
	MockActivityIndicator.displayName = "ActivityIndicator";

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
		AppState: {
			addEventListener: jest.fn(),
		},
		StyleSheet: {
			create: (styles: Record<string, unknown>) => styles,
			flatten: jest.fn(),
		},
		View: MockView,
		Text: MockText,
		Pressable: MockPressable,
		ActivityIndicator: MockActivityIndicator,
		TouchableOpacity: MockTouchableOpacity,
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

// Mock Supabase client (require needed for jest.mock callback)
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("@/config/supabase", () => require("./supabase-mock").mockSupabase);

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();
});
