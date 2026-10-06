import * as React from "react";
import { act, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Setup partner (FEATURE-INVENTORY §1.7).
 *
 * The screen is a re-skin, so the thing worth guarding is that the *write*
 * survived it. §1.7 `:128-218` is a five-step sequence with an order that
 * matters — the profile has to exist before a `couples` row can point at it,
 * and the couple has to exist before `couple_id` can be written back — and
 * there was no test on it. `mockOrder` is that assertion: every call pushes
 * its name, and the test reads the list.
 *
 * `@/config/supabase` is mocked locally rather than through the shared
 * `supabase-mock`, which has no `upsert` and cannot fail a step on demand.
 */

const mockOrder: string[] = [];

/** A supabase query chain: builders return it, awaiting it yields `result`. */
function mockChain(result: unknown) {
	const chain: Record<string, unknown> = {
		then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
			Promise.resolve(result).then(resolve, reject),
	};
	for (const method of ["select", "or", "limit", "eq", "single"]) {
		chain[method] = jest.fn(() => chain);
	}
	return chain;
}

const mockResults = {
	user: { id: "user-1", email: "chase@example.com" } as { id: string; email: string } | null,
	profilesUpsert: { error: null } as { error: unknown },
	couplesSelect: { data: [] as { id: string }[], error: null } as { data: unknown; error: unknown },
	couplesInsert: { data: { id: "couple-1" }, error: null } as { data: unknown; error: unknown },
	couplesUpdate: { data: { id: "couple-0" }, error: null } as { data: unknown; error: unknown },
	profilesUpdate: { error: null } as { error: unknown },
	invite: { error: null } as { error: string | null },
};

const mockCalls = {
	profilesUpsert: jest.fn(),
	couplesInsert: jest.fn(),
	couplesUpdate: jest.fn(),
	profilesUpdate: jest.fn(),
	invitePartner: jest.fn(),
};

function mockStep<T extends unknown[]>(name: string, spy: jest.Mock, result: () => unknown) {
	return (...args: T) => {
		mockOrder.push(name);
		spy(...args);
		return mockChain(result());
	};
}

jest.mock("@/config/supabase", () => ({
	supabase: {
		auth: {
			getUser: jest.fn(() => Promise.resolve({ data: { user: mockResults.user } })),
		},
		from: jest.fn((table: string) =>
			table === "profiles"
				? {
						upsert: mockStep(
							"profiles.upsert",
							mockCalls.profilesUpsert,
							() => mockResults.profilesUpsert,
						),
						update: mockStep(
							"profiles.update",
							mockCalls.profilesUpdate,
							() => mockResults.profilesUpdate,
						),
					}
				: {
						select: () => {
							mockOrder.push("couples.select");
							return mockChain(mockResults.couplesSelect);
						},
						insert: mockStep("couples.insert", mockCalls.couplesInsert, () => mockResults.couplesInsert),
						update: mockStep("couples.update", mockCalls.couplesUpdate, () => mockResults.couplesUpdate),
					},
		),
	},
}));

jest.mock("@/lib/database", () => ({
	invitePartner: jest.fn((...args: unknown[]) => {
		mockOrder.push("invitePartner");
		mockCalls.invitePartner(...args);
		return Promise.resolve(mockResults.invite);
	}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SetupPartner = require("@/app/setup-partner").default;

function renderScreen() {
	return renderAuthScreen(<SetupPartner />);
}

async function fill({
	displayName = "Chase Cole",
	partnerEmail = "nat@example.com",
}: { displayName?: string; partnerEmail?: string } = {}) {
	if (displayName) await userEvent.type(screen.getByLabelText("Your Name"), displayName);
	if (partnerEmail) await userEvent.type(screen.getByLabelText("Partner's Email"), partnerEmail);
	await userEvent.press(screen.getByLabelText("Continue"));
	await act(async () => {});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockOrder.length = 0;
	mockResults.user = { id: "user-1", email: "chase@example.com" };
	mockResults.couplesSelect = { data: [], error: null };
	mockResults.invite = { error: null };
});

describe("the form variant", () => {
	it("opens with the info box, two fields and no card", () => {
		renderScreen();

		expect(
			screen.getByText(
				"Enter your name and your partner's email. They'll sign up separately, then we'll link you together.",
			),
		).toBeTruthy();
		expect(screen.getByLabelText("Your Name")).toBeTruthy();
		expect(screen.getByLabelText("Partner's Email")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.queryByTestId("status-card-success")).toBeNull();
	});
});

describe("validation", () => {
	it("asks for a name and refuses to write", async () => {
		renderScreen();

		await fill({ displayName: "" });

		expect(screen.getByText("Please enter your name.")).toBeTruthy();
		expect(mockOrder).toEqual([]);
	});

	it("rejects an address that is not one", async () => {
		renderScreen();

		await fill({ partnerEmail: "nat-at-example" });

		expect(screen.getByText("Please enter a valid email address.")).toBeTruthy();
		expect(screen.getByLabelText("Partner's Email").props["aria-invalid"]).toBe(true);
		expect(mockOrder).toEqual([]);
	});
});

describe("the write sequence (§1.7 :128-218)", () => {
	it("creates the couple, in order, and lower-cases the pending address", async () => {
		renderScreen();

		await fill({ partnerEmail: "Nat@Example.com" });

		expect(mockOrder).toEqual([
			"profiles.upsert",
			"couples.select",
			"couples.insert",
			"profiles.update",
			"invitePartner",
		]);

		// The profile has to exist before `couples` can point at it.
		expect(mockCalls.profilesUpsert).toHaveBeenCalledWith(
			{ id: "user-1", email: "chase@example.com", display_name: "Chase Cole" },
			{ onConflict: "id" },
		);
		expect(mockCalls.couplesInsert).toHaveBeenCalledWith({
			user1_id: "user-1",
			pending_partner_email: "nat@example.com",
		});
		// …and the couple before `couple_id` is written back onto it.
		expect(mockCalls.profilesUpdate).toHaveBeenCalledWith({ couple_id: "couple-1" });
		// The invite keeps the address as typed.
		expect(mockCalls.invitePartner).toHaveBeenCalledWith("user-1", "Nat@Example.com");
	});

	it("updates the couple that already exists instead of making a second one", async () => {
		mockResults.couplesSelect = { data: [{ id: "couple-0" }], error: null };
		renderScreen();

		await fill();

		expect(mockOrder).toEqual([
			"profiles.upsert",
			"couples.select",
			"couples.update",
			"profiles.update",
			"invitePartner",
		]);
		expect(mockCalls.couplesUpdate).toHaveBeenCalledWith({
			pending_partner_email: "nat@example.com",
		});
		expect(mockCalls.couplesInsert).not.toHaveBeenCalled();
	});
});

describe("the success variant", () => {
	it("names the partner, lists the four steps, and goes to the dashboard", async () => {
		renderScreen();

		await fill();

		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByText("🎉 You're all set!")).toBeTruthy();
		// The address is its own node so it can carry the weight.
		expect(within(card).getByText("nat@example.com")).toBeTruthy();
		expect(within(card).getByText("Next steps:")).toBeTruthy();

		expect(within(card).getByText("Send the app URL to nat@example.com")).toBeTruthy();
		expect(within(card).getByText("Have them sign up with that email")).toBeTruthy();
		expect(within(card).getByText("You'll be automatically linked as partners")).toBeTruthy();
		expect(within(card).getByText("Start making decisions together!")).toBeTruthy();
		// The numerals are drawn, in order — these four steps are a sequence.
		// (`getAllByRole` is not a query under this jest setup; the `role="list"`
		// / `role="listitem"` props are asserted on the nodes themselves.)
		expect(
			within(card)
				.getAllByText(/^[1-4]\.$/)
				.map((n) => n.props.children),
		).toEqual(["1.", "2.", "3.", "4."]);

		// The form is gone.
		expect(screen.queryByLabelText("Your Name")).toBeNull();

		await userEvent.press(screen.getByLabelText("Go to Dashboard"));
		expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(protected)/(tabs)");
	});
});

describe("the error card", () => {
	it("titles the failure and keeps you on the form", async () => {
		mockResults.invite = { error: "Partner already has a couple." };
		renderScreen();

		await fill();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Something went wrong")).toBeTruthy();
		expect(within(card).getByText("Partner already has a couple.")).toBeTruthy();
		expect(screen.getByLabelText("Your Name")).toBeTruthy();
		expect(screen.queryByTestId("status-card-success")).toBeNull();
	});
});
