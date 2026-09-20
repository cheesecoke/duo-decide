/**
 * React Native's own `Animated`, for jest. (Reanimated has its own mock in
 * `reanimated-mock.ts`; the two libraries are both in the tree and only
 * `BottomDrawer` uses this one, because it lives inside a native `Modal`
 * where `useNativeDriver` has to stay off on web.)
 *
 * Drivers land their end value and then report `finished` — after
 * `config.duration` ms, through `setTimeout`, rather than instantly. That
 * matters: `BottomDrawer` holds its `Modal` open until the closing animation
 * says it is done, and an instant that never happens in the app would make
 * that gate untestable. With fake timers a test advances the close itself.
 * A spring carries no duration and settles at once.
 *
 * `stop()` cancels a pending settle and reports `finished: false` — the
 * signal an interrupted animation sends, and the one the drawer reads to know
 * a re-open overtook a close.
 *
 * It lives in its own module because a `jest.mock` factory may not close over
 * out-of-scope names, and babel's hoist check counts a `type` alias as one.
 */

type EndCallback = (result: { finished: boolean }) => void;

export type MockAnimation = {
	start: (callback?: EndCallback) => void;
	stop: () => void;
};

export class MockAnimatedValue {
	_value: number;

	constructor(value: number) {
		this._value = value;
	}

	setValue(value: number) {
		this._value = value;
	}

	/** Interpolation is a read of the same value; nothing here asserts a curve. */
	interpolate() {
		return this;
	}
}

function driver(
	value: MockAnimatedValue,
	config: { toValue?: number; duration?: number } = {},
): MockAnimation {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: EndCallback | undefined;

	const settle = () => {
		timer = null;
		if (typeof config.toValue === "number") value.setValue(config.toValue);
		const callback = pending;
		pending = undefined;
		callback?.({ finished: true });
	};

	return {
		start: (callback?: EndCallback) => {
			pending = callback;
			if (config.duration && config.duration > 0) {
				timer = setTimeout(settle, config.duration);
				return;
			}
			settle();
		},
		stop: () => {
			if (timer) clearTimeout(timer);
			timer = null;
			const callback = pending;
			pending = undefined;
			callback?.({ finished: false });
		},
	};
}

/** `parallel` and `sequence` both finish when every child has. */
function group(animations: MockAnimation[]): MockAnimation {
	return {
		start: (callback?: EndCallback) => {
			// Per-run, not per-composite: a group started a second time (a sheet
			// closed, reopened and closed again) has to be able to resolve again.
			let settled = false;
			let remaining = animations.length;
			if (remaining === 0) {
				callback?.({ finished: true });
				return;
			}

			animations.forEach((animation) =>
				animation.start(({ finished }) => {
					if (settled) return;
					if (!finished) {
						settled = true;
						callback?.({ finished: false });
						return;
					}
					remaining -= 1;
					if (remaining === 0) {
						settled = true;
						callback?.({ finished: true });
					}
				}),
			);
		},
		stop: () => animations.forEach((animation) => animation.stop()),
	};
}

/**
 * The animated host components are the plain ones — the react-native mock's
 * `View` / `Text` / `ScrollView`, passed in because they are defined inside
 * that mock's factory.
 */
export function createAnimatedMock(hosts: { View: unknown; Text: unknown; ScrollView: unknown }) {
	return {
		View: hosts.View,
		Text: hosts.Text,
		ScrollView: hosts.ScrollView,
		Value: MockAnimatedValue,
		timing: driver,
		spring: driver,
		parallel: group,
		sequence: group,
		createAnimatedComponent: (component: unknown) => component,
	};
}
