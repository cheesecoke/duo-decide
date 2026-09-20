import {
	blankOption,
	CUSTOM_OPTIONS_INITIAL,
	customOptionsReducer,
	filledOnly,
	type CustomOptionsAction,
	type CustomOptionsState,
} from "@/components/decision-queue/custom-options.reducer";
import type { DecisionOption } from "@/data/mockData";

/**
 * FEATURE-INVENTORY §1.10b — the Custom Options block's three sub-states:
 *
 *   empty  → one "Add Custom Option" pill
 *   view   → read-only rows + a pencil
 *   editing → a row per option + trash, a cancel/confirm pair, an add pill
 *
 * "empty" is not a mode: it is `formData.customOptions` being empty while the
 * block is in `view`. The reducer owns the other two, plus the draft the
 * editing state types into and the moments that draft is written back.
 */

function option(id: string, title: string): DecisionOption {
	return { id, title, selected: false };
}

const TACOS = option("o1", "Tacos");
const RAMEN = option("o2", "Ramen");
const BLANK = option("o3", "");

const view = (draft: DecisionOption[] = []): CustomOptionsState => ({
	mode: "view",
	draft,
	committed: null,
});

const editing = (draft: DecisionOption[]): CustomOptionsState => ({
	mode: "editing",
	draft,
	committed: null,
});

describe("customOptionsReducer — the sub-state machine", () => {
	const cases: {
		name: string;
		from: CustomOptionsState;
		action: CustomOptionsAction;
		to: CustomOptionsState;
	}[] = [
		{
			// The empty-state pill: one blank row, straight into editing, and
			// the blank row is written back so the block stops being empty and
			// the header grows its cancel/confirm pair.
			name: "addFirst — empty pill creates one blank row, in edit mode, committed",
			from: CUSTOM_OPTIONS_INITIAL,
			action: { type: "addFirst", id: "o3" },
			to: { mode: "editing", draft: [BLANK], committed: [BLANK] },
		},
		{
			name: "edit — the pencil seeds the draft from the committed rows",
			from: view(),
			action: { type: "edit", options: [TACOS, RAMEN] },
			to: editing([TACOS, RAMEN]),
		},
		{
			name: "edit — the seed is a copy, not the caller's array",
			from: view(),
			action: { type: "edit", options: [TACOS] },
			to: editing([TACOS]),
		},
		{
			name: "add — the pill inside edit mode appends a blank row and commits nothing",
			from: editing([TACOS]),
			action: { type: "add", id: "o3" },
			to: editing([TACOS, BLANK]),
		},
		{
			name: "change — typing rewrites one row only",
			from: editing([TACOS, RAMEN]),
			action: { type: "change", index: 1, title: "Ramen at home" },
			to: editing([TACOS, option("o2", "Ramen at home")]),
		},
		{
			name: "change — an index that is not there changes nothing",
			from: editing([TACOS]),
			action: { type: "change", index: 4, title: "Nope" },
			to: editing([TACOS]),
		},
		{
			name: "remove — the trash drops that row by position",
			from: editing([TACOS, RAMEN]),
			action: { type: "remove", index: 0 },
			to: editing([RAMEN]),
		},
		{
			// Removing the last row does NOT leave edit mode: the block only
			// goes back to the empty pill once the emptiness is committed.
			name: "remove — emptying the draft stays in edit mode",
			from: editing([TACOS]),
			action: { type: "remove", index: 0 },
			to: editing([]),
		},
		{
			name: "blur — writes back the rows that have text",
			from: editing([TACOS, BLANK]),
			action: { type: "blur" },
			to: { mode: "editing", draft: [TACOS, BLANK], committed: [TACOS] },
		},
		{
			// Today's guard, kept: a blur that would commit nothing commits
			// nothing, so tabbing through a fresh blank row does not wipe the
			// block the moment it is created.
			name: "blur — commits nothing when every row is blank",
			from: editing([BLANK]),
			action: { type: "blur" },
			to: editing([BLANK]),
		},
		{
			name: "blur — a row of only whitespace does not count as text",
			from: editing([option("o4", "   ")]),
			action: { type: "blur" },
			to: editing([option("o4", "   ")]),
		},
		{
			name: "cancel — leaves edit mode and throws the draft away",
			from: editing([TACOS, option("o9", "typed but abandoned")]),
			action: { type: "cancel", options: [TACOS] },
			to: view([TACOS]),
		},
		{
			name: "confirm — leaves edit mode and writes back the filled rows",
			from: editing([TACOS, BLANK, RAMEN]),
			action: { type: "confirm" },
			to: { mode: "view", draft: [TACOS, RAMEN], committed: [TACOS, RAMEN] },
		},
		{
			name: "confirm — an all-blank draft commits an empty block",
			from: editing([BLANK]),
			action: { type: "confirm" },
			to: { mode: "view", draft: [], committed: [] },
		},
	];

	it.each(cases)("$name", ({ from, action, to }) => {
		expect(customOptionsReducer(from, action)).toEqual(to);
	});

	it("never mutates the state it was given", () => {
		const state = editing([TACOS, RAMEN]);
		const before = JSON.parse(JSON.stringify(state));

		customOptionsReducer(state, { type: "change", index: 0, title: "Tacos al pastor" });
		customOptionsReducer(state, { type: "remove", index: 0 });
		customOptionsReducer(state, { type: "confirm" });

		expect(state).toEqual(before);
	});

	it("clears a previous commit, so the same rows are never written back twice", () => {
		const committed: CustomOptionsState = {
			mode: "editing",
			draft: [TACOS],
			committed: [TACOS],
		};

		expect(
			customOptionsReducer(committed, { type: "change", index: 0, title: "Tacos!" }).committed,
		).toBeNull();
	});
});

describe("filledOnly", () => {
	it.each([
		{ name: "keeps rows with text", rows: [TACOS, RAMEN], kept: ["Tacos", "Ramen"] },
		{ name: "drops empty rows", rows: [TACOS, BLANK], kept: ["Tacos"] },
		{ name: "drops whitespace-only rows", rows: [option("o4", "  \t "), RAMEN], kept: ["Ramen"] },
		{ name: "keeps the order", rows: [RAMEN, BLANK, TACOS], kept: ["Ramen", "Tacos"] },
		{ name: "an empty list stays empty", rows: [], kept: [] },
	])("$name", ({ rows, kept }) => {
		expect(filledOnly(rows).map((row) => row.title)).toEqual(kept);
	});

	it("does not trim the titles it keeps — the text is the user's", () => {
		expect(filledOnly([option("o5", " Tacos ")])[0].title).toBe(" Tacos ");
	});
});

describe("blankOption", () => {
	it("is an unselected row with no text under the id it was given", () => {
		expect(blankOption("temp-1")).toEqual({ id: "temp-1", title: "", selected: false });
	});
});
