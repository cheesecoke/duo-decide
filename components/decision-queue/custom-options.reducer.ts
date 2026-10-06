import type { DecisionOption } from "@/data/mockData";

/**
 * The Custom Options block's sub-state machine (FEATURE-INVENTORY §1.10b).
 *
 * The block has three faces:
 *
 * | face      | what it is                                                      |
 * | --------- | --------------------------------------------------------------- |
 * | `empty`   | `view` with nothing committed — one "Add Custom Option" pill     |
 * | `view`    | read-only rows + a pencil                                        |
 * | `editing` | a row per option + trash, a cancel/confirm pair, an add pill     |
 *
 * Only two of those are modes: "empty" is `view` when the *committed* rows are
 * empty, and the committed rows live in `formData.customOptions`, which the
 * screen owns. So this reducer holds the two things the form has to hold
 * itself — which face is showing, and the draft being typed into — and names
 * the moments the draft is written back through `committed`.
 *
 * `committed` is the whole reason this is a plain function rather than a
 * `useReducer`: the form calls it, reads `committed` off the result and, in
 * the same handler, calls `onFormDataChange`. Every action clears it, so a
 * write-back happens exactly once, on the transition that earned it.
 *
 * Everything here is pure — ids come in on the action rather than from
 * `Date.now()` — which is what lets the whole matrix be a table test.
 */

type CustomOptionsMode = "view" | "editing";

type CustomOptionsState = {
	/** Which face the block is showing. */
	mode: CustomOptionsMode;
	/** The rows being edited. Outside edit mode nothing reads it. */
	draft: DecisionOption[];
	/**
	 * The rows to write back to `formData.customOptions`, or `null` for "this
	 * transition changes nothing outside the block".
	 */
	committed: DecisionOption[] | null;
};

type CustomOptionsAction =
	/** The empty-state pill: one blank row, straight into edit mode. */
	| { type: "addFirst"; id: string }
	/** The pencil. Seeds the draft from the rows as committed. */
	| { type: "edit"; options: DecisionOption[] }
	/** The add pill inside edit mode. Appends. */
	| { type: "add"; id: string }
	/**
	 * Enter in a row. Inserts after that row rather than appending, because
	 * Enter halfway up a list means "and then this one" — the same keystroke
	 * contract the decision card's inline editor has (edit-body.tsx).
	 */
	| { type: "insertAfter"; index: number; id: string }
	| { type: "change"; index: number; title: string }
	/** The per-row trash. */
	| { type: "remove"; index: number }
	/** A row lost focus. */
	| { type: "blur" }
	/** The cancel circle. Takes the rows as committed, to reset the draft. */
	| { type: "cancel"; options: DecisionOption[] }
	/** The confirm circle. */
	| { type: "confirm" };

const CUSTOM_OPTIONS_INITIAL: CustomOptionsState = {
	mode: "view",
	draft: [],
	committed: null,
};

/** A new row: no text, not selected, under the id the caller minted. */
function blankOption(id: string): DecisionOption {
	return { id, title: "", selected: false };
}

/**
 * The rows worth keeping. §1.10b: blank rows are filtered out on confirm and
 * on blur — a row someone opened and walked away from is not an option.
 *
 * The titles themselves are left exactly as typed; trimming them would be a
 * second, unasked-for edit to the user's text.
 */
function filledOnly(options: DecisionOption[]): DecisionOption[] {
	return options.filter((option) => option.title.trim() !== "");
}

function customOptionsReducer(
	state: CustomOptionsState,
	action: CustomOptionsAction,
): CustomOptionsState {
	switch (action.type) {
		case "addFirst": {
			const row = blankOption(action.id);
			// Committed immediately: that is what takes the block out of its
			// empty face, so the header can show the cancel/confirm pair the
			// new row needs.
			return { mode: "editing", draft: [row], committed: [row] };
		}

		case "edit":
			return { mode: "editing", draft: [...action.options], committed: null };

		case "add":
			return { ...state, draft: [...state.draft, blankOption(action.id)], committed: null };

		case "insertAfter": {
			const draft = [...state.draft];
			// Copy-then-splice rather than `toSpliced`, which Hermes does not
			// have on every engine version this ships to.
			draft.splice(action.index + 1, 0, blankOption(action.id));
			return { ...state, draft, committed: null };
		}

		case "change":
			return {
				...state,
				draft: state.draft.map((option, index) =>
					index === action.index ? { ...option, title: action.title } : option,
				),
				committed: null,
			};

		case "remove":
			return {
				...state,
				draft: state.draft.filter((_, index) => index !== action.index),
				committed: null,
			};

		case "blur": {
			const kept = filledOnly(state.draft);
			// A blur that would commit nothing commits nothing. Otherwise
			// tabbing out of a row that was just created — the one the empty
			// pill makes — would wipe the block before it was typed into.
			return { ...state, committed: kept.length > 0 ? kept : null };
		}

		case "cancel":
			// The draft is thrown away, not written back.
			return { mode: "view", draft: [...action.options], committed: null };

		case "confirm": {
			const kept = filledOnly(state.draft);
			return { mode: "view", draft: kept, committed: kept };
		}
	}
}

export { blankOption, CUSTOM_OPTIONS_INITIAL, customOptionsReducer, filledOnly };
export type { CustomOptionsAction, CustomOptionsMode, CustomOptionsState };
