import { createAnimatedMock, MockAnimatedValue } from "@/test-utils/animated-mock";

/**
 * The Animated stand-in is shared infrastructure — every drawer test reads its
 * completion reporting, and a wrong answer here is a test that passes for the
 * wrong reason. So it gets its own coverage: the two things components rely on
 * are that a run settles once its duration has elapsed, and that a composite
 * can be run more than once.
 */

const Animated = createAnimatedMock({ View: null, Text: null, ScrollView: null });

describe("the Animated mock", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("settles a timing after its duration, not before", () => {
		const value = new MockAnimatedValue(0);
		const done = jest.fn();

		Animated.timing(value, { toValue: 1, duration: 220 }).start(done);
		expect(done).not.toHaveBeenCalled();

		jest.advanceTimersByTime(219);
		expect(done).not.toHaveBeenCalled();

		jest.advanceTimersByTime(1);
		expect(done).toHaveBeenCalledWith({ finished: true });
		expect(value._value).toBe(1);
	});

	it("settles a spring at once — a spring carries no duration", () => {
		const value = new MockAnimatedValue(0);
		const done = jest.fn();

		Animated.spring(value, { toValue: 1 }).start(done);

		expect(done).toHaveBeenCalledWith({ finished: true });
	});

	it("reports an interrupted run as unfinished", () => {
		const value = new MockAnimatedValue(0);
		const done = jest.fn();

		const run = Animated.timing(value, { toValue: 1, duration: 220 });
		run.start(done);
		run.stop();

		expect(done).toHaveBeenCalledWith({ finished: false });
		// A stopped run must not also settle later.
		jest.advanceTimersByTime(500);
		expect(done).toHaveBeenCalledTimes(1);
	});

	it("finishes a parallel only when every child has", () => {
		const a = new MockAnimatedValue(0);
		const b = new MockAnimatedValue(0);
		const done = jest.fn();

		Animated.parallel([
			Animated.timing(a, { toValue: 1, duration: 100 }),
			Animated.timing(b, { toValue: 1, duration: 300 }),
		]).start(done);

		jest.advanceTimersByTime(100);
		expect(done).not.toHaveBeenCalled();

		jest.advanceTimersByTime(200);
		expect(done).toHaveBeenCalledWith({ finished: true });
	});

	it("resolves a composite every time it is started", () => {
		const value = new MockAnimatedValue(0);
		const done = jest.fn();

		const run = Animated.parallel([Animated.timing(value, { toValue: 1, duration: 100 })]);

		run.start(done);
		jest.advanceTimersByTime(100);
		expect(done).toHaveBeenCalledTimes(1);

		// The second run is a second answer, not silence.
		run.start(done);
		jest.advanceTimersByTime(100);
		expect(done).toHaveBeenCalledTimes(2);
		expect(done).toHaveBeenLastCalledWith({ finished: true });
	});
});
