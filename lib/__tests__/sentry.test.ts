import * as Sentry from "@sentry/react-native";

import { initSentry } from "../sentry";

describe("initSentry", () => {
	beforeEach(() => jest.clearAllMocks());

	it("does nothing without a DSN", () => {
		expect(initSentry(undefined, false)).toBe(false);
		expect(Sentry.init).not.toHaveBeenCalled();
	});

	it("does nothing in development", () => {
		expect(initSentry("https://key@o0.ingest.sentry.io/1", true)).toBe(false);
		expect(Sentry.init).not.toHaveBeenCalled();
	});

	it("initialises without PII or tracing, and strips request bodies", () => {
		expect(initSentry("https://key@o0.ingest.sentry.io/1", false)).toBe(true);
		const options = (Sentry.init as jest.Mock).mock.calls[0][0];
		expect(options).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0 });
		const event = options.beforeSend({ request: { data: "secret", url: "x" } });
		expect(event.request).toEqual({ url: "x" });
	});
});
