import { useState } from "react";
import { createDecision, updateDecision, deleteDecision } from "@/lib/database";
import type { UserContext } from "@/types/database";
import type { UIDecision } from "./useDecisionsData";
import type { CreateDecisionFormData } from "../components/CreateDecisionForm";

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
				options: result.data!.options.map((option) => ({
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

	const deleteExistingDecision = async (decisionId: string) => {
		try {
			const result = await deleteDecision(decisionId);

			if (result.error) {
				setError(result.error);
				return false;
			}

			setDecisions((prev) => prev.filter((decision) => decision.id !== decisionId));
			return true;
		} catch (err) {
			setError("Failed to delete decision. Please try again.");
			console.error("Error deleting decision:", err);
			return false;
		}
	};

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

	return {
		creating,
		createNewDecision,
		updateExistingDecision,
		deleteExistingDecision,
		updateOptions,
	};
}
