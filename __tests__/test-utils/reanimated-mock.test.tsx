import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Form, FormField, FormItem, FormMessage } from "@/components/ui/Form";
import {
	createReanimatedMock,
	FadeOut,
	interpolate,
	withSequence,
} from "@/test-utils/reanimated-mock";
import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * The Reanimated stand-in (test-utils/reanimated-mock.tsx, wired up in
 * test-utils/setup.ts) has to cover what the app already reaches for, not just
 * what the new design-system components use. `FormMessage` is the sharp case:
 * it calls `FadeOut.duration(275)` while rendering, so a mock that only stubs
 * hooks explodes the moment any form test renders a validation message.
 */

function MessageHarness({ message }: { message: string }) {
	const methods = useForm({ defaultValues: { pick: "" } });

	return (
		<TestWrapper>
			<Form {...methods}>
				<FormField
					control={methods.control}
					name="pick"
					render={() => (
						<FormItem>
							<FormMessage>{message}</FormMessage>
						</FormItem>
					)}
				/>
			</Form>
		</TestWrapper>
	);
}

describe("reanimated mock", () => {
	it("renders Form's FormMessage, which chains FadeOut.duration at render time", () => {
		expect(() => render(<MessageHarness message="Pick a night" />)).not.toThrow();
		expect(screen.getByText("Pick a night")).toBeTruthy();
	});

	it("hands the entering/exiting builders through to the animated node", () => {
		render(<MessageHarness message="Pick a night" />);

		const message = screen.getByText("Pick a night");
		expect(message.props.entering.name).toBe("FadeInDown");
		expect(message.props.exiting.name).toBe("FadeOut");
	});

	it("chains layout-animation modifiers back onto the same builder", () => {
		expect(FadeOut.duration(275)).toBe(FadeOut);
		expect(FadeOut.delay(50).springify()).toBe(FadeOut);
	});

	it("interpolates linearly and clamps at the ends", () => {
		expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
		expect(interpolate(-1, [0, 1], [0, 100])).toBe(0);
		expect(interpolate(2, [0, 1], [0, 100])).toBe(100);
	});

	it("settles a sequence on its last animation", () => {
		expect(withSequence(1, 2, 3)).toBe(3);
	});

	it("names the missing symbol instead of handing back undefined", () => {
		const mock = createReanimatedMock();

		expect(() => mock.useAnimatedGestureHandler).toThrow(
			'reanimated symbol "useAnimatedGestureHandler" not mocked in test-utils/reanimated-mock.tsx',
		);
	});

	it("lets interop and inspection probes through without throwing", () => {
		const mock = createReanimatedMock();

		// Set by babel's ESM→CJS transform, and what `import Animated from`
		// interop keys off — it must report the real value, not throw.
		expect(mock.__esModule).toBe(true);
		expect(mock.then).toBeUndefined();
		expect(mock.nodeType).toBeUndefined();
		expect(mock[Symbol.toStringTag as unknown as string]).toBeUndefined();
		expect(mock.useSharedValue).toBeDefined();
	});
});
