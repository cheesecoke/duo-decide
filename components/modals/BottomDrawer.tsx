import * as React from "react";
// The one place in `components/` that may import RN's own `Animated`: the
// sheet is inside a native `Modal`, where `useNativeDriver` has to stay off on
// web, so Reanimated's `AnimatedView` is not an option. See the note below.
// eslint-disable-next-line no-restricted-imports
import { Animated, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Title } from "@/components/ui/reusables/headline/headline";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR, SPRING } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * BottomDrawer — the sheet every modal surface in the app arrives in
 * (FEATURE-INVENTORY §0.3; the mock's `.scrim` / `.sheet` / `.sheet-hd` /
 * `.sheet-bd` / `.sheet-ft`,
 * design-refs/mocks/decision-queue-round-3.html:318-347).
 *
 * One instance is mounted, in `app/(protected)/(tabs)/_layout.tsx`, and the
 * drawer context decides what goes in it. So this file owns the chrome and
 * nothing else: `radius.sheet` top corners on `surface`, the 2 px `together`
 * gradient hairline across the top — the one place the couple's two hues meet
 * in the shell — a title row with a `.circ` close, a scrolling body, and an
 * optional footer.
 *
 * **The footer is a slot, and it is empty today.** ConfirmDelete, the create
 * sheet and the settings sheet each still draw their own `.sheet-ft` row at
 * the end of their body. Moving all three into this slot is a follow-up, so
 * that they move together rather than leaving the app with two footer
 * conventions at once.
 *
 * Motion (tokens.md §8): the scrim fades in over 180 ms while the sheet rises
 * 40 px on `spring.gentle` and fades over `dur.reveal`; closing sinks the
 * same 40 px over `dur.base`. Reduce-motion lands both ends instantly.
 *
 * `Animated` here is React Native's own rather than Reanimated, because the
 * sheet is inside a native `Modal` and `useNativeDriver` has to stay off on
 * web (§0.3). The layers it drives therefore take a style, not a class — the
 * classed surface is the plain `View` nested inside each of them.
 */

/** The mock's close mark (`IC.close`). Decorative: `CircleButton` names it. */
function CloseGlyph({ size = 17, color = NEUTRAL.ink2 }: { size?: number; color?: string }) {
	return (
		<Svg testID="glyph-sheet-close" width={size} height={size} viewBox="0 0 24 24" fill="none">
			{["M6.5 6.5 17.5 17.5", "M17.5 6.5 6.5 17.5"].map((d) => (
				<Path key={d} d={d} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
			))}
		</Svg>
	);
}

/** `@keyframes rise` — `translateY(40px)` → none. */
const SHEET_RISE = 40;
/** `.scrim { animation: fade 180ms }`. Not a tokens.md §8 duration. */
const SCRIM_FADE = 180;
/** §0.3 keeps the 750 cap and the centring. */
const SHEET_MAX_WIDTH = 750;
/** The mock's `.sheet { max-height: 82% }`. */
const SHEET_MAX_HEIGHT = "82%";
/** `.sheet::before` — the `together` gradient, 2 px of it. */
const HAIRLINE_HEIGHT = 2;

interface BottomDrawerProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	/**
	 * The `.sheet-ft` row — buttons that stay put while the body scrolls.
	 * Omit it and the sheet ends at its body, which is what every caller does
	 * today.
	 */
	footer?: React.ReactNode;
}

export function BottomDrawer({ visible, onClose, title, children, footer }: BottomDrawerProps) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	// On web, useNativeDriver must be false (no native driver); avoids console warning.
	const useNativeDriver = Platform.OS !== "web";

	const scrim = React.useRef(new Animated.Value(0)).current;
	const rise = React.useRef(new Animated.Value(0)).current;
	const fade = React.useRef(new Animated.Value(0)).current;

	/**
	 * The sink has to outlive `visible`.
	 *
	 * `Modal` unmounts its whole tree the frame `visible` goes false, so a
	 * closing animation started at that moment runs against a tree nobody can
	 * see — the sheet vanishes instead of sinking. So the Modal is held open
	 * on `visible || mounted` and only lets go once the animation reports it
	 * finished. Reduce-motion lets go immediately: there is nothing to watch.
	 */
	const [mounted, setMounted] = React.useState(visible);

	React.useEffect(() => {
		if (visible) {
			setMounted(true);

			if (reducedMotion) {
				scrim.setValue(1);
				rise.setValue(1);
				fade.setValue(1);
				return;
			}

			const entrance = Animated.parallel([
				Animated.timing(scrim, { toValue: 1, duration: SCRIM_FADE, useNativeDriver }),
				Animated.spring(rise, { toValue: 1, ...SPRING.gentle, useNativeDriver }),
				Animated.timing(fade, { toValue: 1, duration: DUR.reveal, useNativeDriver }),
			]);
			entrance.start();
			return () => entrance.stop();
		}

		if (reducedMotion) {
			scrim.setValue(0);
			rise.setValue(0);
			fade.setValue(0);
			setMounted(false);
			return;
		}

		const exit = Animated.parallel([
			Animated.timing(scrim, { toValue: 0, duration: DUR.base, useNativeDriver }),
			Animated.timing(rise, { toValue: 0, duration: DUR.base, useNativeDriver }),
			Animated.timing(fade, { toValue: 0, duration: DUR.base, useNativeDriver }),
		]);
		// `finished` is false when a re-open interrupted this one — letting go
		// then would tear down a sheet that is on its way back in.
		exit.start(({ finished }) => {
			if (finished) setMounted(false);
		});
		return () => exit.stop();
	}, [visible, reducedMotion, useNativeDriver, scrim, rise, fade]);

	const translateY = rise.interpolate({
		inputRange: [0, 1],
		outputRange: [SHEET_RISE, 0],
	});

	/**
	 * What the sheet shows while it sinks.
	 *
	 * The drawer context empties itself in one batch — `hideDrawer()` sets
	 * `isVisible` false *and* `title` to "" *and* `content` to null — so the
	 * very render that starts the close already has nothing in it. Without a
	 * latch the 220 ms the Modal is held open would sink an empty stub: a
	 * blank title, a close circle and an empty body.
	 *
	 * So the last props seen while open are kept, and they are what renders
	 * from the moment `visible` goes false until the Modal lets go. Written
	 * during render rather than in an effect because an effect lands a frame
	 * late — which is the blank frame this exists to prevent. It is a pure
	 * copy of the props, so re-running it (StrictMode) changes nothing.
	 */
	const latched = React.useRef({ title, children, footer });
	if (visible) {
		latched.current = { title, children, footer };
	}
	const shown = visible ? { title, children, footer } : latched.current;

	/** The window where the Modal is up but the sheet is on its way out. */
	const closing = !visible && mounted;

	return (
		<Modal visible={visible || mounted} transparent animationType="none" onRequestClose={onClose}>
			{/* The whole overlay goes inert while the sheet sinks: the latched
			    body still holds live buttons (a "Delete", a "Sign out"), and a
			    late tap must neither re-fire them nor fall through the fading
			    scrim onto the screen underneath. */}
			<View
				testID="drawer-overlay"
				pointerEvents={closing ? "none" : "auto"}
				style={{ flex: 1, justifyContent: "flex-end" }}
			>
				{/* The scrim is its own layer so the backdrop can fade on a
				    different curve from the sheet, the way the mock's two
				    keyframes do. `scrim` is the one neutral with alpha in it. */}
				<Animated.View
					testID="drawer-scrim"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: NEUTRAL.scrim,
						opacity: scrim,
					}}
				>
					{/* Not an accessibility target: an open sheet already offers
					    two labelled ways out (the title-row circle, and the
					    sheet's own footer button), and a third "Close" in the
					    rotor is noise rather than help. */}
					<Pressable testID="drawer-backdrop" accessible={false} onPress={onClose} style={{ flex: 1 }} />
				</Animated.View>

				<Animated.View
					style={[
						{
							width: "100%",
							maxWidth: SHEET_MAX_WIDTH,
							maxHeight: SHEET_MAX_HEIGHT,
							alignSelf: "center",
							flexShrink: 1,
							opacity: fade,
							transform: [{ translateY }],
						},
						SHADOW.float,
					]}
				>
					{/* `overflow-hidden` is what clips the hairline and the body
					    to the 32 px top corners. */}
					<View className="shrink overflow-hidden rounded-t-sheet bg-surface">
						<View className="flex-row items-center justify-between gap-3 px-5 pb-3 pt-[18px]">
							<Title className="shrink">{shown.title}</Title>
							<CircleButton label="Close" testID="drawer-close" onPress={onClose}>
								<CloseGlyph />
							</CircleButton>
						</View>

						<ScrollView
							className="shrink px-5 pb-5"
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="always"
							keyboardDismissMode="on-drag"
							bounces={false}
							nestedScrollEnabled={true}
						>
							{shown.children}
						</ScrollView>

						{shown.footer ? (
							<View
								testID="drawer-footer"
								className="flex-row gap-2.5 border-t border-line px-5 pb-[22px] pt-3.5"
							>
								{shown.footer}
							</View>
						) : null}

						{/* Drawn last so it sits over the header row's background
						    rather than under it. */}
						<LinearGradient
							pointerEvents="none"
							colors={[person.a.base, person.b.base]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								height: HAIRLINE_HEIGHT,
							}}
						/>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

export type { BottomDrawerProps };
