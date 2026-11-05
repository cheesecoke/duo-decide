// invitePartner on native: React Native defines `window` but not
// `window.location`, so reading `window.location.origin` threw on iOS
// (Settings → Invite partner, "Cannot read property 'origin' of undefined").

import { Platform } from "react-native";

import { invitePartner } from "@/lib/database";
import { supabase } from "@/config/supabase";
import { resetMockData, setMockCouples, setMockProfiles } from "@/test-utils/supabase-mock";
import { USER_1_ID, mockCouple, mockProfiles } from "@/test-utils/fixtures";

describe("invitePartner", () => {
	const g = globalThis as any;
	const originalOS = Platform.OS;
	const originalWindow = g.window;
	const originalLocation = g.location;
	const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

	beforeEach(() => {
		resetMockData();
		setMockCouples([{ ...mockCouple }]);
		setMockProfiles(mockProfiles);
		jest.mocked(supabase.functions.invoke).mockClear();
		delete process.env.EXPO_PUBLIC_APP_URL;
	});

	afterEach(() => {
		(Platform as any).OS = originalOS;
		g.window = originalWindow;
		g.location = originalLocation;
		if (originalAppUrl === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
		else process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
	});

	const sentAppUrl = () =>
		(jest.mocked(supabase.functions.invoke).mock.calls[0] as any[])[1].body.appUrl;

	it("sends the invite on iOS, where window exists but window.location does not", async () => {
		(Platform as any).OS = "ios";
		g.window = {};
		g.location = undefined;

		const result = await invitePartner(USER_1_ID, "Partner@Example.com");

		expect(result.error).toBeNull();
		expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
		expect(sentAppUrl()).toBe("https://duo-decide.com");
		expect((jest.mocked(supabase.functions.invoke).mock.calls[0] as any[])[1].body.partnerEmail).toBe(
			"partner@example.com",
		);
	});

	it("links to EXPO_PUBLIC_APP_URL on native when it is set", async () => {
		(Platform as any).OS = "ios";
		g.window = {};
		g.location = undefined;
		process.env.EXPO_PUBLIC_APP_URL = "https://preview.duo-decide.com/";

		await invitePartner(USER_1_ID, "partner@example.com");

		expect(sentAppUrl()).toBe("https://preview.duo-decide.com");
	});

	it("links back to the current origin on web", async () => {
		(Platform as any).OS = "web";
		g.location = { origin: "http://localhost:8081" };
		g.window = { location: g.location };

		await invitePartner(USER_1_ID, "partner@example.com");

		expect(sentAppUrl()).toBe("http://localhost:8081");
	});
});
