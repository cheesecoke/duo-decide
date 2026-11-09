import * as React from "react";
import {
	Dimensions,
	Keyboard,
	LayoutAnimation,
	Platform,
	TextInput,
	type KeyboardEvent,
	type LayoutAnimationConfig,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	type ScrollView,
	type View,
} from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Keyboard geometry for the forms, as pure functions plus the one hook that
 * feeds them.
 *
 * ## Why not `measureInWindow`
 *
 * TestFlight build 9 lifted the auth sheets with a KeyboardAvoidingView whose
 * `keyboardVerticalOffset` was the layout's `measureInWindow` y (#37). Under
 * the new architecture (`newArchEnabled`, RN 0.79) `measureInWindow` is read
 * off the *shadow tree*, not UIKit, and react-native-screens lays a native
 * page sheet out at y = 0 there: the sheet's real offset from the top of the
 * window (about 10 pt under the status bar) is a UIKit transform the shadow
 * tree never hears about. So on sign-in, sign-up, forgot-password,
 * delete-account and change-password the offset came up short by exactly
 * the sheet's top offset, every time — not a timing race, measuring later
 * gives the same number — and the footer landed that far too low: the submit
 * button's bottom edge at, or just under, the top of the keyboard.
 *
 * The one number that does not depend on where a sheet sits is how far the
 * keyboard reaches up from the bottom of the window: the keyboard's frame
 * comes from UIKit in true screen coordinates, and every screen that uses
 * this (an auth screen, full-screen or page sheet; `supportsTablet` is false,
 * so always an iPhone geometry) runs to the bottom of the window. A layout
 * whose bottom edge is the window's bottom has to give up exactly that much.
 */

/** Air between the last thing in a lifted form and the keyboard's top edge. */
export const KEYBOARD_GAP = 12;

/** The parts of a keyboard event's `endCoordinates` the lift reads. */
export interface KeyboardFrame {
	screenY: number;
	height: number;
}

/**
 * How far a layout that runs to the bottom of the window has to lift for its
 * bottom edge to sit on the keyboard's top edge. 0 while the keyboard is
 * down.
 *
 * - The overlap is the keyboard's reach up from the window's bottom,
 *   `windowHeight - screenY`.
 * - It is capped at the keyboard's own height. With "Prefer Cross-Fade
 *   Transitions" on, iOS reports `screenY` as 0 (React Native's own
 *   KeyboardAvoidingView special-cases this); the cap turns that into the
 *   keyboard's height rather than the whole window.
 * - A keyboard going down reports `screenY` at (or past) the window's
 *   bottom, which is 0. So is any frame that makes no sense.
 */
export function keyboardLift(frame: KeyboardFrame, windowHeight: number): number {
	const { screenY, height } = frame;
	if (![screenY, height, windowHeight].every(Number.isFinite)) return 0;
	const overlap = Math.min(windowHeight - screenY, height);
	return Math.max(0, Math.round(overlap));
}

/**
 * Where a scroll body has to scroll to for a field to be in full view, or
 * `null` when it already is. `field` is in the body's content coordinates,
 * `body` is its scroll offset and visible height. A field taller than the
 * body (a long description) keeps its top in view rather than its bottom.
 *
 * Shared by the auth screens (ContentLayout) and the bottom drawer (#39).
 */
export const REVEAL_MARGIN = 16;

export function revealOffset(
	field: { y: number; height: number },
	body: { offset: number; height: number },
	margin = REVEAL_MARGIN,
): number | null {
	if (body.height <= 0) return null;
	const top = field.y - margin;
	const bottom = field.y + field.height + margin;
	if (bottom > body.offset + body.height) {
		return Math.max(0, Math.min(top, bottom - body.height));
	}
	if (top < body.offset) return Math.max(0, top);
	return null;
}

/**
 * The layout animation that moves the lift in step with the keyboard: its
 * own duration and curve, the way React Native's KeyboardAvoidingView does
 * it. `null` when there is nothing to animate with (reduced motion, or an
 * event without timing).
 */
export function liftAnimation(
	event: Pick<KeyboardEvent, "duration" | "easing">,
	reducedMotion: boolean,
): LayoutAnimationConfig | null {
	if (reducedMotion || !event.duration || !event.easing) return null;
	// RCTLayoutAnimation's floor is 10 ms.
	const duration = Math.max(event.duration, 10);
	return {
		duration,
		update: {
			duration,
			type: LayoutAnimation.Types?.[event.easing] ?? LayoutAnimation.Types?.keyboard ?? "keyboard",
		},
	};
}

const LIFT_EVENTS = ["keyboardWillShow", "keyboardWillChangeFrame", "keyboardWillHide"] as const;

/**
 * The live lift (iOS) for a layout that runs to the bottom of the window.
 * Android resizes the window for the keyboard itself and web has none, so
 * both stay at 0, as they did under the KeyboardAvoidingView.
 *
 * Recomputed on every keyboard event from that event's own frame and the
 * window's height at that moment — nothing is measured once and kept.
 */
export function useKeyboardLift(enabled: boolean): number {
	const reducedMotion = useReducedMotion();
	const [lift, setLift] = React.useState(0);
	const current = React.useRef(0);
	const motion = React.useRef(reducedMotion);
	motion.current = reducedMotion;

	React.useEffect(() => {
		if (!enabled || Platform.OS !== "ios") return;

		const onKeyboard = (event: KeyboardEvent) => {
			const next = keyboardLift(event.endCoordinates, Dimensions.get("window").height);
			if (next === current.current) return;
			current.current = next;
			// Only when the value changes: a configured animation applies to
			// the *next* layout, whatever causes it.
			const animation = liftAnimation(event, motion.current);
			if (animation) LayoutAnimation.configureNext(animation);
			setLift(next);
		};

		const subscriptions = LIFT_EVENTS.map((name) => Keyboard.addListener(name, onKeyboard));
		return () => subscriptions.forEach((subscription) => subscription.remove());
	}, [enabled]);

	return enabled ? lift : 0;
}

/**
 * Reveal-on-focus for a scroll body (#39, shared). Wire `body` to the
 * ScrollView with `onBodyLayout` / `onBodyScroll`, and `content` to a View
 * around its children with `revealFocused` on its `onLayout` and `onFocus`
 * (TextInput's focus event bubbles on iOS).
 *
 * The body then scrolls the focused field into its visible part at the
 * moments one can end up hidden: the field takes focus, the body shrinks
 * under a focused field (the keyboard landing after the focus that raised
 * it), and the content grows under one (an added row). The body *growing*
 * reveals nothing: that is the keyboard going down, often from a drag that is
 * scrolling somewhere else.
 */
export function useRevealFocused() {
	const body = React.useRef<ScrollView>(null);
	const content = React.useRef<View>(null);
	const viewport = React.useRef({ offset: 0, height: 0 });

	const revealFocused = React.useCallback(() => {
		const field = TextInput.State.currentlyFocusedInput();
		const node = content.current;
		if (!field || !node) return;
		field.measureLayout(
			node,
			(_x, y, _width, height) => {
				const to = revealOffset({ y, height }, viewport.current);
				if (to !== null) body.current?.scrollTo({ y: to, animated: true });
			},
			// A focused field outside this body is not this body's to scroll to.
			() => {},
		);
	}, []);

	const onBodyLayout = React.useCallback(
		(event: LayoutChangeEvent) => {
			const { height } = event.nativeEvent.layout;
			const shrank = height < viewport.current.height;
			viewport.current.height = height;
			if (shrank) revealFocused();
		},
		[revealFocused],
	);

	const onBodyScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		viewport.current.offset = event.nativeEvent.contentOffset.y;
	}, []);

	return { body, content, revealFocused, onBodyLayout, onBodyScroll };
}
