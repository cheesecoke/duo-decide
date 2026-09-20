import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";

/**
 * The sheet's own contract. That the *screen* opens it, and that confirming
 * reaches `deleteExistingDecision` exactly once, is covered in
 * __tests__/app/decision-queue.test.tsx.
 *
 * `userEvent` rather than `fireEvent`, for the reason chip.test.tsx gives:
 * fireEvent walks up to composite parents and would fire a handler the host
 * element never accepted.
 */

describe("ConfirmDelete", () => {
	it("quotes the decision in the mock's copy", () => {
		render(<ConfirmDelete title="Which couch" onCancel={jest.fn()} onConfirm={jest.fn()} />);

		expect(
			screen.getByText(
				"“Which couch” and every vote on it are removed for both of you. This cannot be undone.",
			),
		).toBeTruthy();
	});

	// The Options tab reuses this sheet for a list, whose consequences are not
	// the decision's (PLAN-3 task 10). Passing a message replaces the sentence
	// and nothing else.
	it("says what the caller says, when the caller says something", () => {
		render(
			<ConfirmDelete
				title="Dinner spots"
				message="“Dinner spots” and its options are removed for both of you. Decisions you already made from it keep their options."
				onCancel={jest.fn()}
				onConfirm={jest.fn()}
			/>,
		);

		expect(
			screen.getByText(
				"“Dinner spots” and its options are removed for both of you. Decisions you already made from it keep their options.",
			),
		).toBeTruthy();
		expect(screen.queryByText(/every vote on it/)).toBeNull();
		expect(screen.getByLabelText("Keep it")).toBeTruthy();
		expect(screen.getByLabelText("Delete")).toBeTruthy();
	});

	it("keeps it — cancels without deleting", async () => {
		const onCancel = jest.fn();
		const onConfirm = jest.fn();
		render(<ConfirmDelete title="Which couch" onCancel={onCancel} onConfirm={onConfirm} />);

		await userEvent.press(screen.getByLabelText("Keep it"));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("deletes once, and does not also cancel", async () => {
		const onCancel = jest.fn();
		const onConfirm = jest.fn();
		render(<ConfirmDelete title="Which couch" onCancel={onCancel} onConfirm={onConfirm} />);

		await userEvent.press(screen.getByLabelText("Delete"));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});
});
