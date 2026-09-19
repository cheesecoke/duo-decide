import { HUE_PRESETS, getPreset, pairVars, type HuePresetId } from "@/theme/presets";

describe("HUE_PRESETS", () => {
	it("ships the five presets from tokens.md §2", () => {
		expect(HUE_PRESETS.map((p) => p.id)).toEqual(["sage", "blush", "butter", "lavender", "sky"]);
	});

	it("gives every preset a base/tint/deep HSL triplet on its own hue", () => {
		for (const preset of HUE_PRESETS) {
			for (const step of [preset.base, preset.tint, preset.deep]) {
				expect(step).toMatch(/^\d{1,3} \d{1,3}% \d{1,3}%$/);
				expect(Number(step.split(" ")[0])).toBe(preset.hue);
			}
		}
	});
});

describe("pairVars", () => {
	it("defaults to sage (A) + blush (B)", () => {
		expect(pairVars()).toEqual({
			"--person-a-base": "150 32% 62%",
			"--person-a-tint": "150 45% 92%",
			"--person-a-deep": "150 30% 28%",
			"--person-b-base": "355 65% 78%",
			"--person-b-tint": "355 80% 94%",
			"--person-b-deep": "355 40% 34%",
		});
	});

	it("matches the global.css .theme-sage-blush block", () => {
		expect(pairVars("sage", "blush")).toEqual(pairVars());
	});

	it("swaps both people independently", () => {
		const vars = pairVars("butter", "sky");
		expect(vars["--person-a-base"]).toBe("46 80% 70%");
		expect(vars["--person-b-deep"]).toBe("200 40% 30%");
	});

	it("can give both people the same hue", () => {
		const vars = pairVars("sky", "sky");
		expect(vars["--person-a-tint"]).toBe(vars["--person-b-tint"]);
	});

	it("throws on an unknown preset id", () => {
		expect(() => pairVars("chartreuse", "blush")).toThrow(/Unknown hue preset "chartreuse"/);
		expect(() => pairVars("sage", "chartreuse")).toThrow(/Unknown hue preset "chartreuse"/);
	});
});

describe("getPreset", () => {
	it("returns the row for a known id", () => {
		expect(getPreset("lavender" satisfies HuePresetId).hue).toBe(250);
	});

	it("lists the known presets in its error", () => {
		expect(() => getPreset("nope")).toThrow(/Known presets: sage, blush, butter, lavender, sky/);
	});
});
