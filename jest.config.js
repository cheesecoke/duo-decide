module.exports = {
	// Use basic preset without expo-specific setup that causes issues
	transform: {
		"^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
	},
	setupFilesAfterEnv: ["<rootDir>/test-utils/setup.ts"],
	transformIgnorePatterns: [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)",
	],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
	collectCoverageFrom: [
		"lib/**/*.{ts,tsx}",
		"hooks/**/*.{ts,tsx}",
		"components/**/*.{ts,tsx}",
		"!**/*.d.ts",
		"!**/node_modules/**",
	],
	// Coverage thresholds for critical paths only
	// UI components will be tested separately
	coverageThreshold: {
		"./lib/database.ts": {
			branches: 25,
			functions: 50,
			lines: 40,
			statements: 40,
		},
		"./hooks/decision-queue/useDecisionVoting.ts": {
			branches: 50,
			functions: 80,
			lines: 65,
			statements: 65,
		},
		"./hooks/decision-queue/useDecisionsData.ts": {
			branches: 25,
			functions: 50,
			lines: 70,
			statements: 70,
		},
	},
	testEnvironment: "node",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
