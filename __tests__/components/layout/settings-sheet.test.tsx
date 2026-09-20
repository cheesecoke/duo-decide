import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { SettingsSheet, validatePartnerEmail } from "@/components/layout/settings-sheet";
import type { UserContext } from "@/types/database";

/**
 * The settings sheet's body (FEATURE-INVENTORY §0.2).
 *
 * The sheet is pure, so everything §0.2 promises is assertable from props:
 * the three partner variants, the labels that flip while a request is in
 * flight, and which controls stop. That the *header* opens it and re-renders
 * it through `updateContent` is covered in header.test.tsx.
 *
 * `userEvent` rather than `fireEvent`, for the reason chip.test.tsx gives:
 * fireEvent walks up to composite parents and would fire a handler the host
 * element never accepted.
 */

const BASE: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: null,
	partnerName: null,
};

const LINKED: UserContext = { ...BASE, partnerId: "user-2", partnerName: "Sam" };
const PENDING: UserContext = { ...BASE, pendingPartnerEmail: "sam@example.com" };

function renderSheet(props: Partial<React.ComponentProps<typeof SettingsSheet>> = {}) {
	const handlers = {
		onPartnerEmailChange: jest.fn(),
		onInvite: jest.fn(),
		onResendInvitation: jest.fn(),
		onCancelInvitation: jest.fn(),
		onChangePassword: jest.fn(),
		onSignOut: jest.fn(),
		onClose: jest.fn(),
	};
	render(
		<SettingsSheet
			userContext={BASE}
			partnerEmail=""
			inviting={false}
			error={null}
			{...handlers}
			{...props}
		/>,
	);
	return handlers;
}

describe("partner status — the three variants (§0.2)", () => {
	it("A: a linked partner is named, and there is nothing to invite", () => {
		renderSheet({ userContext: LINKED });

		expect(screen.getByText("Partner: Sam")).toBeTruthy();
		expect(screen.getByText("✓ Partner linked")).toBeTruthy();
		expect(screen.queryByLabelText("Partner's email")).toBeNull();
		expect(screen.queryByLabelText("Invite Partner")).toBeNull();
		expect(screen.queryByLabelText("Resend")).toBeNull();
	});

	it("B: a pending invite shows the address, the wait, and cancel / resend", () => {
		renderSheet({ userContext: PENDING });

		expect(screen.getByText("Invited: sam@example.com")).toBeTruthy();
		expect(screen.getByText("⏳ Waiting for partner to sign up")).toBeTruthy();
		expect(screen.getByLabelText("Cancel")).toBeTruthy();
		expect(screen.getByLabelText("Resend")).toBeTruthy();
		expect(screen.queryByLabelText("Partner's email")).toBeNull();
	});

	it("C: no partner warns, and offers the field", () => {
		renderSheet();

		expect(screen.getByText("⚠️ No partner linked")).toBeTruthy();
		expect(screen.getByLabelText("Partner's email")).toBeTruthy();
		expect(screen.getByLabelText("Invite Partner")).toBeTruthy();
	});

	it("always names the person reading it", () => {
		renderSheet({ userContext: LINKED });
		expect(screen.getByText("Chase")).toBeTruthy();
	});

	it("waits for the context rather than guessing a variant", () => {
		renderSheet({ userContext: null });

		expect(screen.queryByText("⚠️ No partner linked")).toBeNull();
		expect(screen.queryByLabelText("Partner's email")).toBeNull();
		// Account is not partner-dependent and stays.
		expect(screen.getByLabelText("Sign out")).toBeTruthy();
	});
});

describe("the invite button's rules (§0.2)", () => {
	it("is dead while the field is empty", async () => {
		const handlers = renderSheet({ partnerEmail: "   " });

		const button = screen.getByLabelText("Invite Partner");
		expect(button.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(button);
		expect(handlers.onInvite).not.toHaveBeenCalled();
	});

	it("sends once the field has something in it", async () => {
		const handlers = renderSheet({ partnerEmail: "sam@example.com" });

		await userEvent.press(screen.getByLabelText("Invite Partner"));

		expect(handlers.onInvite).toHaveBeenCalledTimes(1);
	});

	it("says Sending… and stops while in flight", async () => {
		const handlers = renderSheet({ partnerEmail: "sam@example.com", inviting: true });

		const button = screen.getByLabelText("Sending…");
		expect(screen.getByText("Sending…")).toBeTruthy();
		expect(button.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(button);
		expect(handlers.onInvite).not.toHaveBeenCalled();
	});

	it("shows the error under the field", () => {
		renderSheet({ error: "Please enter a valid email address" });

		expect(screen.getByText("Please enter a valid email address")).toBeTruthy();
	});
});

describe("the pending pair's rules (§0.2)", () => {
	it("cancels and resends", async () => {
		const handlers = renderSheet({ userContext: PENDING });

		await userEvent.press(screen.getByLabelText("Cancel"));
		await userEvent.press(screen.getByLabelText("Resend"));

		expect(handlers.onCancelInvitation).toHaveBeenCalledTimes(1);
		expect(handlers.onResendInvitation).toHaveBeenCalledTimes(1);
	});

	it("stops both while a request is in flight, and Resend flips to Sending…", async () => {
		const handlers = renderSheet({ userContext: PENDING, inviting: true });

		const cancel = screen.getByLabelText("Cancel");
		const resend = screen.getByLabelText("Sending…");
		expect(cancel.props.accessibilityState).toMatchObject({ disabled: true });
		expect(resend.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(cancel);
		await userEvent.press(resend);

		expect(handlers.onCancelInvitation).not.toHaveBeenCalled();
		expect(handlers.onResendInvitation).not.toHaveBeenCalled();
	});

	it("shows the error above the pair", () => {
		renderSheet({ userContext: PENDING, error: "Failed to resend invitation. Please try again." });

		expect(screen.getByText("Failed to resend invitation. Please try again.")).toBeTruthy();
	});
});

describe("account and close", () => {
	it("routes to change password and signs out", async () => {
		const handlers = renderSheet();

		await userEvent.press(screen.getByLabelText("Change password"));
		await userEvent.press(screen.getByLabelText("Sign out"));

		expect(handlers.onChangePassword).toHaveBeenCalledTimes(1);
		expect(handlers.onSignOut).toHaveBeenCalledTimes(1);
	});

	it("closes", async () => {
		const handlers = renderSheet();

		await userEvent.press(screen.getByLabelText("Close"));

		expect(handlers.onClose).toHaveBeenCalledTimes(1);
	});
});

describe("validatePartnerEmail", () => {
	it.each(["sam@example.com", "a.b+c@sub.domain.co"])("accepts %s", (email) => {
		expect(validatePartnerEmail(email)).toBeNull();
	});

	it.each(["", "sam", "sam@", "sam@example", "sam @example.com", "@example.com"])(
		"rejects %p",
		(email) => {
			expect(validatePartnerEmail(email)).toBe("Please enter a valid email address");
		},
	);
});
