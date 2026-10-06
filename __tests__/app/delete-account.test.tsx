import * as React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import DeleteAccount from "@/app/delete-account";
import { consequencesFor } from "@/lib/account-deletion";
import { getUserContext } from "@/lib/database";
import { TestWrapper } from "@/test-utils/test-wrapper";

const mockDeleteAccount = jest.fn();

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => ({ deleteAccount: mockDeleteAccount }),
}));

jest.mock("@/lib/database", () => ({ getUserContext: jest.fn() }));

const LINKED = {
	userId: "me",
	userName: "Chase",
	partnerId: "them",
	partnerName: "Sam",
	coupleId: "c",
};
const SOLO = { ...LINKED, partnerId: null, partnerName: null };

async function renderScreen(ctx: unknown = LINKED) {
	jest.mocked(getUserContext).mockResolvedValue(ctx as never);
	render(<DeleteAccount />, { wrapper: TestWrapper });
	await waitFor(() => expect(screen.getByTestId("delete-consequences")).toBeTruthy());
}

const deleteButton = () => screen.getByLabelText("Delete my account");

beforeEach(() => mockDeleteAccount.mockReset());

describe("consequencesFor", () => {
	it("tells a linked user their partner keeps completed history", () => {
		const lines = consequencesFor({ linked: true, partnerName: "Sam" }).join(" ");
		expect(lines).toMatch(/stay in Sam's history/);
		expect(lines).toMatch(/still open are deleted/);
	});

	it("tells a solo user everything goes", () => {
		expect(consequencesFor({ linked: false, partnerName: null }).join(" ")).toMatch(
			/All of your decisions, votes and option lists are deleted/,
		);
	});
});

describe("DeleteAccount", () => {
	it("shows the linked copy with the partner's name", async () => {
		await renderScreen(LINKED);
		expect(screen.getByText(/stay in Sam's history/)).toBeTruthy();
	});

	it("shows the solo copy when no partner is linked", async () => {
		await renderScreen(SOLO);
		expect(screen.getByText(/All of your decisions/)).toBeTruthy();
	});

	it("stays disabled until DELETE is typed", async () => {
		await renderScreen();
		expect(deleteButton().props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "delete");

		expect(deleteButton().props.accessibilityState).toMatchObject({ disabled: false });
	});

	it("deletes, then goes to Welcome", async () => {
		mockDeleteAccount.mockResolvedValue(undefined);
		await renderScreen();
		await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");

		await userEvent.press(deleteButton());

		expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith("/welcome");
	});

	it("says so and stays put when the delete fails", async () => {
		mockDeleteAccount.mockRejectedValue(new Error("network"));
		await renderScreen();
		await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");

		await userEvent.press(deleteButton());

		expect(await screen.findByText("Couldn't delete account")).toBeTruthy();
		expect(router.replace).not.toHaveBeenCalled();
	});
});
