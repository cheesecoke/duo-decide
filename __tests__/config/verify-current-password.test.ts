process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

import { verifyCurrentPassword } from "@/config/verify-current-password";

describe("verifyCurrentPassword", () => {
	afterEach(() => jest.restoreAllMocks());

	it("returns true on 200 and calls the token endpoint correctly", async () => {
		const fetchMock = jest
			.spyOn(global, "fetch")
			.mockResolvedValue({ ok: true, status: 200 } as Response);
		await expect(verifyCurrentPassword("a@b.com", "pw")).resolves.toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://test.supabase.co/auth/v1/token?grant_type=password",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json", apikey: "anon-key" },
				body: JSON.stringify({ email: "a@b.com", password: "pw" }),
			}),
		);
	});

	it("returns false on 400 (invalid credentials)", async () => {
		jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 400 } as Response);
		await expect(verifyCurrentPassword("a@b.com", "bad")).resolves.toBe(false);
	});

	it("throws on 429 so the caller can surface a rate-limit message", async () => {
		jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 429 } as Response);
		await expect(verifyCurrentPassword("a@b.com", "pw")).rejects.toThrow("429");
	});

	it("throws on network failure (not a wrong-password signal)", async () => {
		jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
		await expect(verifyCurrentPassword("a@b.com", "pw")).rejects.toThrow();
	});
});
