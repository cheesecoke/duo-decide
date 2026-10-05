import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import * as Linking from "expo-linking";

import { LegalPage, splitLast } from "@/components/legal/legal-page";
import { PRIVACY_POLICY, SUPPORT_EMAIL, SUPPORT_PAGE } from "@/lib/legal";
import { TestWrapper } from "@/test-utils/test-wrapper";

describe("splitLast", () => {
	it.each([
		["Privacy Policy", ["Privacy ", "Policy"]],
		["Support", ["", "Support"]],
	])("%s", (title, expected) => {
		expect(splitLast(title)).toEqual(expected);
	});
});

describe("LegalPage", () => {
	it("renders every section of the privacy policy", () => {
		render(<LegalPage document={PRIVACY_POLICY} />, { wrapper: TestWrapper });

		for (const section of PRIVACY_POLICY.sections) {
			expect(screen.getByText(section.heading)).toBeTruthy();
		}
	});

	it("tells people how to delete their account in the app", () => {
		render(<LegalPage document={PRIVACY_POLICY} />, { wrapper: TestWrapper });

		expect(screen.getByText(/open Settings, then Delete account/)).toBeTruthy();
	});

	it("opens a mail draft to support", async () => {
		render(<LegalPage document={SUPPORT_PAGE} />, { wrapper: TestWrapper });

		await userEvent.press(screen.getByLabelText(`Email ${SUPPORT_EMAIL}`));

		expect(Linking.openURL).toHaveBeenCalledWith(`mailto:${SUPPORT_EMAIL}`);
	});
});
