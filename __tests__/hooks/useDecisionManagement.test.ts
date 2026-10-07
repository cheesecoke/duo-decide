import { act, renderHook } from "@testing-library/react-native";

import type { CreateDecisionFormData } from "@/components/decision-queue/CreateDecisionForm";
import { useDecisionManagement } from "@/hooks/decision-queue/useDecisionManagement";
import { getMockDecisions, resetMockData } from "@/test-utils/supabase-mock";
import { user1Context } from "@/test-utils/fixtures";

const form = (over: Partial<CreateDecisionFormData>): CreateDecisionFormData => ({
	title: "Dinner?",
	description: "",
	dueDate: "",
	decisionType: "poll",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [],
	...over,
});

const opts = (n: number) =>
	["Tacos", "Ramen", "Pho"].slice(0, n).map((title, i) => ({ id: `c${i}`, title, selected: false }));

describe("useDecisionManagement.createNewDecision option minimums", () => {
	beforeEach(() => resetMockData());

	it("refuses a poll with two options and creates nothing", async () => {
		const setError = jest.fn();
		const { result } = renderHook(() => useDecisionManagement(user1Context, jest.fn(), setError));

		let created: unknown;
		await act(async () => {
			created = await result.current.createNewDecision(form({ customOptions: opts(2) }));
		});

		expect(created).toBeNull();
		expect(setError).toHaveBeenCalledWith("Polls need at least 3 options");
		expect(getMockDecisions()).toHaveLength(0);
		expect(result.current.creating).toBe(false);
	});

	it("creates a poll with three options", async () => {
		const setError = jest.fn();
		const { result } = renderHook(() => useDecisionManagement(user1Context, jest.fn(), setError));

		await act(async () => {
			await result.current.createNewDecision(form({ customOptions: opts(3) }));
		});

		expect(setError).not.toHaveBeenCalledWith("Polls need at least 3 options");
		expect(getMockDecisions()).toHaveLength(1);
	});
});
