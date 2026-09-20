import AsyncStorage from "@react-native-async-storage/async-storage";

import { getPersonPair, setPersonPair } from "@/lib/personPairStorage";
import { DEFAULT_PAIR } from "@/theme/pair-choice";

/**
 * The per-user row. `test-utils/setup.ts` mocks AsyncStorage as plain
 * jest.fns whose `getItem` resolves null, so each test says what the device
 * is holding with `mockResolvedValueOnce`.
 */

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

describe("getPersonPair", () => {
	it("reads the row for that user, and no other", async () => {
		getItem.mockResolvedValueOnce(JSON.stringify({ a: "sky", b: "butter" }));

		await expect(getPersonPair("user-1")).resolves.toEqual({ a: "sky", b: "butter" });
		expect(getItem).toHaveBeenCalledWith("duo_person_pair_user-1");
	});

	it("keeps two users apart", async () => {
		await getPersonPair("user-1");
		await getPersonPair("user-2");

		expect(getItem).toHaveBeenNthCalledWith(1, "duo_person_pair_user-1");
		expect(getItem).toHaveBeenNthCalledWith(2, "duo_person_pair_user-2");
	});

	it("gives the defaults when nothing is stored", async () => {
		await expect(getPersonPair("user-1")).resolves.toEqual(DEFAULT_PAIR);
	});

	it("gives the defaults on a corrupt row rather than throwing", async () => {
		getItem.mockResolvedValueOnce('{"a":"chartreuse"');

		await expect(getPersonPair("user-1")).resolves.toEqual(DEFAULT_PAIR);
	});

	it("gives the defaults when the device itself refuses", async () => {
		getItem.mockRejectedValueOnce(new Error("no storage"));

		await expect(getPersonPair("user-1")).resolves.toEqual(DEFAULT_PAIR);
	});
});

describe("setPersonPair", () => {
	it("writes the two ids under the user's key", async () => {
		await setPersonPair("user-1", { a: "lavender", b: "butter" });

		expect(setItem).toHaveBeenCalledWith(
			"duo_person_pair_user-1",
			JSON.stringify({ a: "lavender", b: "butter" }),
		);
	});

	it("round-trips through getPersonPair", async () => {
		await setPersonPair("user-1", { a: "sky", b: "sage" });
		getItem.mockResolvedValueOnce(setItem.mock.calls[0][1]);

		await expect(getPersonPair("user-1")).resolves.toEqual({ a: "sky", b: "sage" });
	});

	it("swallows a write the device refuses", async () => {
		setItem.mockRejectedValueOnce(new Error("disk full"));

		await expect(setPersonPair("user-1", { a: "sky", b: "sage" })).resolves.toBeUndefined();
	});
});
