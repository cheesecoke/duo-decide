import { validateDecision } from "@/lib/validations/decision";
import type { CreateDecisionFormData } from "@/components/decision-queue/CreateDecisionForm";

const base = (over: Partial<CreateDecisionFormData> = {}): CreateDecisionFormData => ({
	title: "Dinner",
	description: "",
	dueDate: "2999-01-01",
	decisionType: "vote",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [
		{ id: "1", title: "Pizza", selected: false },
		{ id: "2", title: "Sushi", selected: false },
	],
	...over,
});

describe("validateDecision", () => {
	it("flags an empty title", () => {
		expect(validateDecision(base({ title: "" }), false).title).toBeDefined();
		expect(validateDecision(base({ title: "   " }), false).title).toBeDefined();
	});

	it("flags a past deadline when creating", () => {
		expect(validateDecision(base({ dueDate: "2020-01-01" }), false).dueDate).toBeDefined();
	});

	it("allows a past deadline when editing an existing decision", () => {
		expect(validateDecision(base({ dueDate: "2020-01-01" }), true).dueDate).toBeUndefined();
	});

	it("flags fewer than two options", () => {
		const errs = validateDecision(
			base({ customOptions: [{ id: "1", title: "Pizza", selected: false }] }),
			false,
		);
		expect(errs.options).toBeDefined();
	});

	it("counts selected list options toward the two-option minimum", () => {
		const errs = validateDecision(
			base({
				customOptions: [],
				selectedOptions: [
					{ id: "a", title: "A", selected: true },
					{ id: "b", title: "B", selected: true },
				],
			}),
			false,
		);
		expect(errs.options).toBeUndefined();
	});

	it("ignores blank custom options when counting", () => {
		const errs = validateDecision(
			base({
				customOptions: [
					{ id: "1", title: "Pizza", selected: false },
					{ id: "2", title: "   ", selected: false },
				],
			}),
			false,
		);
		expect(errs.options).toBeDefined();
	});

	it("passes a fully valid decision with no errors", () => {
		expect(validateDecision(base(), false)).toEqual({});
	});
});
