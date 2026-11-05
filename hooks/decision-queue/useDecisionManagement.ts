import { useState } from "react";
import {
	archiveDecision,
	createDecision,
	softDeleteDecision,
	syncDecisionOptions,
	updateDecision,
	type DatabaseResult,
} from "@/lib/database";
import type { UserContext } from "@/types/database";
import type { UIDecision } from "./useDecisionsData";
import type { CreateDecisionFormData } from "@/components/decision-queue/CreateDecisionForm";
import { optionShortfall } from "@/lib/decision-rules";

export function useDecisionManagement(
	userContext: UserContext | null,
	setDecisions: React.Dispatch<React.SetStateAction<UIDecision[]>>,
	setError: (error: string | null) => void,
) {
	const [creating, setCreating] = useState(false);

	const createNewDecision = async (formData: CreateDecisionFormData) => {
		if (!formData.title.trim() || !userContext) return null;

		setCreating(true);
		setError(null);

		try {
			// Combine selected options from list and custom options
			const selectedListOptions = formData.selectedOptions.filter((opt) => opt.selected);
			const allOptions = [...selectedListOptions, ...formData.customOptions];

			// Backstop for the form's own check: never create a poll with fewer
			// than 3 options, or a vote with fewer than 2.
			const shortfall = optionShortfall(
				formData.decisionType,
				allOptions.filter((opt) => opt.title.trim()).length,
			);
			if (shortfall) {
				setError(shortfall);
				return null;
			}

			const options = allOptions.map((opt) => ({
				title: opt.title,
				votes: 0,
				eliminated_in_round: null,
			}));

			const decisionData = {
				title: formData.title,
				description: formData.description || null,
				deadline: formData.dueDate || null,
				creator_id: userContext.userId,
				partner_id: userContext.partnerId || userContext.userId,
				couple_id: userContext.coupleId,
				type: formData.decisionType,
				status: "pending" as const,
				current_round: 1,
			};

			const result = await createDecision(
				decisionData,
				options.map((option) => ({
					...option,
					decision_id: "",
				})),
			);

			if (result.error) {
				setError(result.error);
				return null;
			}

			// Transform to UI decision
			const newUIDecision: UIDecision = {
				...result.data!,
				expanded: false,
				createdBy: userContext.userName,
				details: result.data!.description || "",
				decidedBy: undefined,
				decidedAt: undefined,
				options: (result.data!.options || []).map((option) => ({
					id: option.id,
					title: option.title,
					selected: false,
				})),
			};

			setDecisions((prev) => [newUIDecision, ...prev]);
			return newUIDecision;
		} catch (err) {
			setError("Failed to create decision. Please try again.");
			console.error("Error creating decision:", err);
			return null;
		} finally {
			setCreating(false);
		}
	};

	const updateExistingDecision = async (decisionId: string, formData: CreateDecisionFormData) => {
		if (!formData.title.trim()) return false;

		setCreating(true);
		setError(null);

		try {
			const decisionData = {
				title: formData.title,
				description: formData.description || null,
				deadline: formData.dueDate || null,
				type: formData.decisionType,
			};

			const result = await updateDecision(decisionId, decisionData);

			if (result.error) {
				setError(result.error);
				return false;
			}

			// Update local state
			setDecisions((prev) =>
				prev.map((decision) =>
					decision.id === decisionId
						? {
								...decision,
								title: result.data!.title,
								description: result.data!.description,
								deadline: result.data!.deadline,
								type: result.data!.type,
								details: result.data!.description || "",
							}
						: decision,
				),
			);

			return true;
		} catch (err) {
			setError("Failed to update decision. Please try again.");
			console.error("Error updating decision:", err);
			return false;
		} finally {
			setCreating(false);
		}
	};

	/**
	 * Takes a decision off the queue — optimistically, with a rollback.
	 *
	 * The card goes at once; if the write fails it comes back where it was
	 * (same index, same view state) and the screen's error strip says why.
	 * The partner's queue drops it through the realtime UPDATE
	 * (useDecisionsData's `isOffQueue`).
	 */
	const removeFromQueue = async (
		decisionId: string,
		write: (id: string) => Promise<DatabaseResult<boolean>>,
		failure: string,
	) => {
		// Filled in by the removal's updater. The rollback reads it inside its
		// own updater, which React runs after the removal's, so it is set by then.
		const removed: { current: { decision: UIDecision; index: number } | null } = { current: null };
		setDecisions((prev) => {
			const index = prev.findIndex((decision) => decision.id === decisionId);
			if (index === -1) return prev;
			removed.current = { decision: prev[index], index };
			return prev.filter((decision) => decision.id !== decisionId);
		});
		setError(null);

		const rollback = (message: string) => {
			setDecisions((prev) => {
				const restore = removed.current;
				if (!restore || prev.some((decision) => decision.id === decisionId)) return prev;
				const next = [...prev];
				next.splice(Math.min(restore.index, next.length), 0, restore.decision);
				return next;
			});
			setError(message);
			return false;
		};

		try {
			const result = await write(decisionId);
			if (result.error) return rollback(result.error);
			return true;
		} catch (err) {
			console.error(failure, err);
			return rollback(failure);
		}
	};

	/** A decided decision's ⋮ → Archive: off the queue for both, still in History. */
	const archiveExistingDecision = (decisionId: string) =>
		removeFromQueue(decisionId, archiveDecision, "Failed to archive decision. Please try again.");

	/** An open decision's ⋮ → Delete. A soft delete: the row stays, nobody sees it. */
	const softDeleteExistingDecision = (decisionId: string) =>
		removeFromQueue(decisionId, softDeleteDecision, "Failed to delete decision. Please try again.");

	const updateOptions = (
		decisionId: string,
		newOptions: { id: string; title: string; selected: boolean }[],
	) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId ? { ...decision, options: newOptions } : decision,
			),
		);
	};

	/** Persist inline card edits (title, details, deadline, options) to API and local state. Works for both vote and poll. */
	const updateDecisionInline = async (
		decisionId: string,
		payload: {
			title: string;
			details: string;
			deadline: string;
			options: { id: string; title: string; selected: boolean }[];
		},
	) => {
		if (!payload.title.trim()) return false;

		setError(null);
		try {
			const decisionData = {
				title: payload.title.trim(),
				description: payload.details.trim() || null,
				deadline: payload.deadline.trim() || null,
			};

			const result = await updateDecision(decisionId, decisionData);

			if (result.error) {
				setError(result.error);
				return false;
			}

			// Sync options to database
			const optionsResult = await syncDecisionOptions(
				decisionId,
				payload.options.map((o) => ({ id: o.id, title: o.title })),
			);

			if (optionsResult.error) {
				setError(optionsResult.error);
				return false;
			}

			// Build options with real IDs from DB
			const syncedOptions = (optionsResult.data || []).map((o) => ({
				id: o.id,
				title: o.title,
				selected: false,
			}));

			setDecisions((prev) =>
				prev.map((decision) =>
					decision.id === decisionId
						? {
								...decision,
								title: result.data!.title,
								details: result.data!.description || "",
								deadline: result.data!.deadline || "",
								options: syncedOptions,
							}
						: decision,
				),
			);
			return true;
		} catch (err) {
			setError("Failed to update decision. Please try again.");
			console.error("Error updating decision:", err);
			return false;
		}
	};

	return {
		creating,
		createNewDecision,
		updateExistingDecision,
		updateDecisionInline,
		archiveExistingDecision,
		softDeleteExistingDecision,
		updateOptions,
	};
}
