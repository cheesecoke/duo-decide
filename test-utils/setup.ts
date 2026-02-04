// Jest setup file for Duo app tests

// Mock React Native Platform
jest.mock("react-native", () => ({
	Platform: {
		OS: "ios",
		select: jest.fn((obj) => obj.ios || obj.default),
	},
	AppState: {
		addEventListener: jest.fn(),
	},
	StyleSheet: {
		create: (styles: Record<string, any>) => styles,
		flatten: jest.fn(),
	},
}));

// Mock Expo modules
jest.mock("expo-secure-store", () => ({
	setItemAsync: jest.fn(() => Promise.resolve()),
	getItemAsync: jest.fn(() => Promise.resolve(null)),
	deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
	setItem: jest.fn(() => Promise.resolve()),
	getItem: jest.fn(() => Promise.resolve(null)),
	removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-get-random-values
jest.mock("react-native-get-random-values", () => ({}));

// Mock Supabase client
jest.mock("@/config/supabase", () => require("./supabase-mock").mockSupabase);

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();
});
