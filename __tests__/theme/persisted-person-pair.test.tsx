import * as React from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import { PersistedPersonPair } from "@/theme/PersistedPersonPair";
import { PersonPairProvider, usePersonPair } from "@/theme/PersonPairProvider";
import { DEFAULT_PAIR } from "@/theme/pair-choice";
import type { PersonPairIds } from "@/theme/usePersonColors";

/**
 * The persisted layer. The root provider is the real, stateless one wrapped
 * in the `useState` `app/_layout.tsx` wraps it in — the point of this file is
 * that a stored pair reaches the CSS-var writer, so faking that would test
 * nothing.
 *
 * `test-utils/setup.ts` mocks AsyncStorage as jest.fns whose `getItem`
 * resolves null; each test says what the device holds with
 * `mockResolvedValueOnce`.
 */

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

/** What `app/_layout.tsx` does: hold the pair, hand it to the provider. */
function Root({ children }: { children: React.ReactNode }) {
	const [pair, setPair] = React.useState<PersonPairIds>(DEFAULT_PAIR);
	return (
		<PersonPairProvider a={pair.a} b={pair.b} onChange={setPair}>
			{children}
		</PersonPairProvider>
	);
}

/** Reads the pair back out of the context the provider publishes. */
function Readout() {
	const { a, b } = usePersonPair();
	return <Text testID="pair">{`${a}+${b}`}</Text>;
}

/** A picker, standing in for `HuePicker`. */
function Picker({ to }: { to: PersonPairIds }) {
	const { setPair } = usePersonPair();
	return <Text onPress={() => setPair(to)}>pick</Text>;
}

function stored(a: string, b: string) {
	return JSON.stringify({ a, b });
}

async function renderPersisted(userId: string | null, children: React.ReactNode) {
	const view = render(
		<Root>
			<Readout />
			<PersistedPersonPair userId={userId} fallback={<Text>Loading…</Text>}>
				{children}
			</PersistedPersonPair>
		</Root>,
	);
	await act(async () => {});
	return view;
}

describe("the stored pair is applied before the children render", () => {
	it("holds the children behind the fallback until the row has been read", async () => {
		let resolve: ((value: string | null) => void) | undefined;
		getItem.mockReturnValueOnce(
			new Promise<string | null>((r) => {
				resolve = r;
			}),
		);

		render(
			<Root>
				<PersistedPersonPair userId="user-1" fallback={<Text>Loading…</Text>}>
					<Text>the app</Text>
				</PersistedPersonPair>
			</Root>,
		);

		expect(screen.getByText("Loading…")).toBeTruthy();
		expect(screen.queryByText("the app")).toBeNull();

		await act(async () => {
			resolve?.(stored("sky", "butter"));
		});

		expect(screen.getByText("the app")).toBeTruthy();
		expect(screen.queryByText("Loading…")).toBeNull();
	});

	it("never shows the children under the default pair", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		// If the children rendered before the read landed, this would catch
		// them wearing sage + blush.
		function Spy() {
			const { a, b } = usePersonPair();
			seen.push(`${a}+${b}`);
			return null;
		}
		const seen: string[] = [];

		await renderPersisted("user-1", <Spy />);

		expect(seen).toEqual(["sky+butter"]);
	});

	it("reads the row for that user", async () => {
		await renderPersisted("user-7", <Text>the app</Text>);

		expect(getItem).toHaveBeenCalledWith("duo_person_pair_user-7");
	});

	it("puts the stored pair on the provider", async () => {
		getItem.mockResolvedValueOnce(stored("lavender", "butter"));

		await renderPersisted("user-1", <Text>the app</Text>);

		expect(screen.getByTestId("pair").children).toEqual(["lavender+butter"]);
	});

	it("falls back to the defaults on a corrupt row, and does not throw", async () => {
		getItem.mockResolvedValueOnce('{"a":"chartreuse","b":"blush"}');

		await renderPersisted("user-1", <Text>the app</Text>);

		expect(screen.getByTestId("pair").children).toEqual(["sage+blush"]);
		expect(screen.getByText("the app")).toBeTruthy();
	});
});

describe("a change is written", () => {
	it("persists the new pair under the user's key", async () => {
		getItem.mockResolvedValueOnce(stored("sage", "blush"));

		await renderPersisted("user-1", <Picker to={{ a: "sky", b: "butter" }} />);
		setItem.mockClear();

		await act(async () => {
			await userEvent.setup().press(screen.getByText("pick"));
		});

		await waitFor(() =>
			expect(setItem).toHaveBeenCalledWith(
				"duo_person_pair_user-1",
				JSON.stringify({ a: "sky", b: "butter" }),
			),
		);
		expect(screen.getByTestId("pair").children).toEqual(["sky+butter"]);
	});

	it("does not echo the pair it just read straight back to the device", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		await renderPersisted("user-1", <Text>the app</Text>);

		expect(setItem).not.toHaveBeenCalled();
	});
});

describe("one user's pair never carries to the next", () => {
	/**
	 * The live path. In the app, signing out does not set `userId` to null —
	 * `ProtectedLayout` returns a `Redirect` and the whole protected tree,
	 * this component included, unmounts. The root provider is above it and
	 * stays, still holding the signed-out user's pair, so the reset has to
	 * come from the effect's cleanup or the next person to sign in on this
	 * device inherits their colours.
	 */
	it("resets to the defaults when the protected tree unmounts under it", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		// The root provider is rendered here and the protected subtree is what
		// gets unmounted, exactly as `app/_layout.tsx` and `ProtectedLayout`
		// are nested.
		function App({ signedIn }: { signedIn: boolean }) {
			return (
				<Root>
					<Readout />
					{signedIn ? (
						<PersistedPersonPair userId="user-1" fallback={<Text>Loading…</Text>}>
							<Text>the app</Text>
						</PersistedPersonPair>
					) : (
						<Text>welcome</Text>
					)}
				</Root>
			);
		}

		const { rerender } = render(<App signedIn />);
		await act(async () => {});
		expect(screen.getByTestId("pair").children).toEqual(["sky+butter"]);

		await act(async () => {
			rerender(<App signedIn={false} />);
		});

		expect(screen.getByText("welcome")).toBeTruthy();
		expect(screen.getByTestId("pair").children).toEqual(["sage+blush"]);
	});

	// Cheap defence, and unreachable from the only call site — `ProtectedLayout`
	// renders this inside the branch where `userContext` is non-null.
	it("resets to the defaults when the user goes away", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		const { rerender } = await renderPersisted("user-1", <Text>the app</Text>);
		expect(screen.getByTestId("pair").children).toEqual(["sky+butter"]);

		// Signing out: the protected tree unmounts, the root provider does not.
		await act(async () => {
			rerender(
				<Root>
					<Readout />
					<PersistedPersonPair userId={null} fallback={<Text>Loading…</Text>}>
						<Text>the app</Text>
					</PersistedPersonPair>
				</Root>,
			);
		});

		expect(screen.getByTestId("pair").children).toEqual(["sage+blush"]);
	});

	it("loads the next user's own pair on a switch", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		const { rerender } = await renderPersisted("user-1", <Text>the app</Text>);
		expect(screen.getByTestId("pair").children).toEqual(["sky+butter"]);

		getItem.mockResolvedValueOnce(stored("lavender", "sage"));
		await act(async () => {
			rerender(
				<Root>
					<Readout />
					<PersistedPersonPair userId="user-2" fallback={<Text>Loading…</Text>}>
						<Text>the app</Text>
					</PersistedPersonPair>
				</Root>,
			);
		});

		expect(getItem).toHaveBeenLastCalledWith("duo_person_pair_user-2");
		expect(screen.getByTestId("pair").children).toEqual(["lavender+sage"]);
	});

	it("does not write the old user's pair under the new user's key", async () => {
		getItem.mockResolvedValueOnce(stored("sky", "butter"));

		const { rerender } = await renderPersisted("user-1", <Text>the app</Text>);
		setItem.mockClear();

		await act(async () => {
			rerender(
				<Root>
					<Readout />
					<PersistedPersonPair userId="user-2" fallback={<Text>Loading…</Text>}>
						<Text>the app</Text>
					</PersistedPersonPair>
				</Root>,
			);
		});

		expect(setItem).not.toHaveBeenCalled();
	});

	it("renders its children straight away when nobody is signed in", async () => {
		await renderPersisted(null, <Text>the app</Text>);

		expect(screen.getByText("the app")).toBeTruthy();
		expect(getItem).not.toHaveBeenCalled();
	});
});
