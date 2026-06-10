import * as z from "zod";
import type { CreateDecisionFormData } from "@/components/decision-queue/CreateDecisionForm";

const baseSchema = z.object({
	title: z.string().trim().min(1, "Title is required"),
	description: z.string(),
	dueDate: z.string(),
	decisionType: z.enum(["poll", "vote"]),
	selectedOptionListId: z.string(),
	selectedOptions: z.array(z.object({ id: z.string(), title: z.string(), selected: z.boolean() })),
	customOptions: z.array(z.object({ id: z.string(), title: z.string(), selected: z.boolean() })),
});

export const decisionSchema = (isEditing: boolean) =>
	baseSchema.superRefine((data, ctx) => {
		if (!isEditing && data.dueDate) {
			const deadline = new Date(data.dueDate);
			if (!isNaN(deadline.getTime()) && deadline <= new Date()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Deadline must be in the future",
					path: ["dueDate"],
				});
			}
		}

		const selectedCount = data.selectedOptions.filter((o) => o.selected).length;
		const customCount = data.customOptions.filter((o) => o.title.trim() !== "").length;
		if (selectedCount + customCount < 2) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Add at least two options",
				path: ["options"],
			});
		}
	});

export type DecisionValidationErrors = Partial<Record<"title" | "dueDate" | "options", string>>;

export function validateDecision(
	formData: CreateDecisionFormData,
	isEditing: boolean,
): DecisionValidationErrors {
	const result = decisionSchema(isEditing).safeParse(formData);
	if (result.success) return {};

	const errors: DecisionValidationErrors = {};
	for (const issue of result.error.issues) {
		const field = issue.path[0] as keyof DecisionValidationErrors;
		if (!errors[field]) {
			errors[field] = issue.message;
		}
	}
	return errors;
}
