import * as React from "react";
import { AppState, Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { NavigationContext } from "@react-navigation/native";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { PersonVarsBoundary } from "@/theme/PersonVarsBoundary";
import { SHADOW } from "@/theme/shadows";

/**
 * CardMenu — the `⋯` overflow every card header hides its destructive
 * actions behind.
 *
 * It was the decision card's private markup. The options tab grew the same
 * need and copied the *other* pattern instead — a bare trash circle at the
 * bottom of the open card — so the app had two delete gestures for the same
 * kind of object. One of them is now this (tweak T3).
 *
 * **Why three exports and not one.** The trigger belongs in the header's
 * control cluster and the panel floats over everything, so they are two
 * components; the open state lives in neither of them: `useCardMenu` holds it
 * and the two halves share it. That also keeps the closing rules in one place.
 *
 * ## It is a popover: a tap anywhere else closes it
 *
 * Chase, on iPhone (Nov 2026): "The drop down for archive will only close if
 * you select archive. I need to be able to click off without selecting it."
 * The panel used to be an absolutely positioned sibling inside the card, so
 * nothing outside its own 172 px knew it was open — a tap on the page, the
 * header, or the list scrolling went to whatever was under the finger and the
 * panel stayed up.
 *
 * So the open panel now renders in a transparent React Native `Modal`, over a
 * full-screen, invisible backdrop that closes it (`menu-backdrop`). That is
 * the standard popover contract, and the Modal is what makes it airtight on
 * iOS: every touch outside the panel lands on the backdrop, so it closes the
 * menu **and does nothing else** — no card expands, no Archive fires, and the
 * list cannot scroll out from under a panel that would then float in the
 * wrong place (a drag on the backdrop closes it on release instead; the
 * backdrop's press never cancels however far the finger travels). A tap on
 * `⋯` again is a tap on the backdrop too, so the trigger still toggles.
 *
 * A screen-level "menu host" (one absolute backdrop in a provider) was the
 * alternative. It would need a provider on every screen and still lose to a
 * card's own `overflow-hidden` and to the tab bar, which sits outside the
 * screen's tree; the Modal needs neither and is already how BottomDrawer and
 * the DatePicker float. JS only: `Modal` ships in React Native itself.
 *
 * The rest of the contract:
 *
 * - **Placed at its trigger.** The trigger is measured with `measureInWindow`
 *   when the menu opens and the panel hangs under it, right edges aligned.
 *   It flips above the trigger when it would run off the bottom of the
 *   window and is clamped to the window's edges. (These cards are on
 *   full-screen tab screens, not page sheets, so the shadow-tree measurement
 *   `components/layout/keyboard.ts` warns about is the real position here.)
 *   It stays invisible until it has been placed, then fades in over
 *   `DUR.fast` — or simply appears, under Reduce Motion.
 * - **One at a time.** Opening a menu closes whichever other one is open.
 * - **Closes when the screen does**: a tab switch or navigation (`blur`), the
 *   app going to the background, the window resizing, Android's back button
 *   and Escape on web (both reach `onRequestClose`; react-native-web's Modal
 *   listens for Escape itself).
 * - **Accessible.** The panel is `role="menu"`, its rows `menuitem`, and the
 *   trigger reports `expanded`. VoiceOver is confined to the Modal while it
 *   is up, the backdrop is a named "Close menu" button, and the scrub
 *   gesture (`onAccessibilityEscape`) closes it too.
 *
 * **Why an item's action waits for `onDismiss` on iOS.** Delete opens a
 * confirmation sheet, which is a second Modal. UIKit will not present one
 * view controller while the menu's is still being dismissed, and the sheet
 * simply never appeared. So on iOS the chosen action runs from the menu
 * Modal's `onDismiss` (with a short fallback timer, in case that event never
 * comes); everywhere else it runs as the menu closes.
 */

type CardMenuItem = {
	/** The row's copy *and* its accessible name — they are the same thing. */
	label: string;
	onPress: () => void;
	/** Paints the row `destructive` — Delete, never Archive. */
	destructive?: boolean;
	/** Decorative: the row carries the name, so the mark needs none. */
	icon?: React.ReactNode;
};

type CardMenuState = {
	open: boolean;
	toggle: () => void;
	close: () => void;
	/** The trigger's box, measured when the menu opens to place the panel. */
	triggerRef: React.RefObject<View | null>;
};

type CardMenuProps = {
	menu: CardMenuState;
	items: readonly CardMenuItem[];
	testID?: string;
	/** Extra classes for the panel. Its position is the trigger's, not a class. */
	className?: string;
};

type CardMenuTriggerProps = {
	menu: CardMenuState;
	/** Overridable, but "More" is what every card says. */
	label?: string;
};

/**
 * The marks this menu is drawn with, here rather than imported for the reason
 * `icon-button.tsx` gives about its chevron: `assets/icons/*` wraps
 * `phosphor-react-native`, and nothing in the design system pulls that in.
 * Same rules as every other glyph — 24 unit grid, stroke 2, round caps, no
 * fill — and both are decorative, since the control around them is named.
 *
 * `TrashGlyph` is here and not in `decision-queue/decision-card/glyphs.tsx`
 * so that the options tab can draw the identical delete row without importing
 * out of another feature's folder. That file re-exports this one; the edit
 * bodies that use it for their own remove buttons did not have to move.
 */
function glyph(paths: readonly string[], testID: string) {
	function Glyph({ size = 18, color = NEUTRAL.ink2 }: { size?: number; color?: string }) {
		return (
			<Svg testID={testID} width={size} height={size} viewBox="0 0 24 24" fill="none">
				{paths.map((d) => (
					<Path
						key={d}
						d={d}
						stroke={color}
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
					/>
				))}
			</Svg>
		);
	}
	Glyph.displayName = testID;
	return Glyph;
}

/** More — the three dots the menu hangs off. */
const DotsGlyph = glyph(["M12 6.5v.01", "M12 12v.01", "M12 17.5v.01"], "glyph-dots");

/** Delete — the destructive item. */
const TrashGlyph = glyph(
	["M4.5 7h15", "M10 4.5h4", "M6.5 7 7.5 20h9L17.5 7", "M10.5 11v5.5", "M13.5 11v5.5"],
	"glyph-trash",
);

/** Archive — a box with its lid on: put away, not thrown away. */
const ArchiveGlyph = glyph(["M4 5h16v4H4z", "M5.5 9v10h13V9", "M10 13h4"], "glyph-archive");

/** The gap between the trigger and the panel, and the panel's window margin. */
const GAP = 6;
const EDGE = 12;
/** How long iOS gets to report the menu's dismissal before the action runs anyway. */
const DISMISS_FALLBACK_MS = 400;
/** A press on the backdrop never cancels: a drag that ends anywhere still closes. */
const FAR = { top: 10000, bottom: 10000, left: 10000, right: 10000 };

/**
 * The open menu's `close`, if any — "one at a time". Module state, not
 * context, so it holds across cards, rows and screens with no provider.
 */
let closeOpenMenu: (() => void) | null = null;

/** The open state the trigger and the panel share. */
function useCardMenu(initialOpen = false): CardMenuState {
	const [open, setOpen] = React.useState(initialOpen);
	const triggerRef = React.useRef<View>(null);

	const close = React.useCallback(() => setOpen(false), []);
	const toggle = React.useCallback(() => setOpen((current) => !current), []);

	// Optional: Storybook and the unit tests render cards with no navigator.
	const navigation = React.useContext(NavigationContext);

	React.useEffect(() => {
		if (!open) return;
		if (closeOpenMenu !== close) {
			closeOpenMenu?.();
			closeOpenMenu = close;
		}

		const offBlur = navigation?.addListener?.("blur", close);
		const appState = AppState.addEventListener?.("change", (next) => {
			if (next !== "active") close();
		});

		return () => {
			if (closeOpenMenu === close) closeOpenMenu = null;
			offBlur?.();
			appState?.remove?.();
		};
	}, [open, close, navigation]);

	return React.useMemo(() => ({ open, toggle, close, triggerRef }), [open, toggle, close]);
}

function CardMenuTrigger({ menu, label = "More" }: CardMenuTriggerProps) {
	// The wrapper is what gets measured: `IconButton` does not forward a ref,
	// and `collapsable={false}` keeps Android from flattening the view away.
	return (
		<View ref={menu.triggerRef} collapsable={false}>
			<IconButton label={label} accessibilityState={{ expanded: menu.open }} onPress={menu.toggle}>
				<DotsGlyph />
			</IconButton>
		</View>
	);
}

type Box = { x: number; y: number; width: number; height: number };

/** Where the panel goes: under the trigger, or over it when below runs out. */
function placePanel(
	anchor: Box,
	panel: { width: number; height: number },
	win: { width: number; height: number },
): { top: number; right: number } {
	const below = anchor.y + anchor.height + GAP;
	const above = anchor.y - GAP - panel.height;
	const fitsBelow = below + panel.height <= win.height - EDGE;
	const top = fitsBelow || above < EDGE ? below : above;

	const right = win.width - (anchor.x + anchor.width);
	return {
		top: Math.max(EDGE, Math.min(top, win.height - EDGE - panel.height)),
		right: Math.max(EDGE, Math.min(right, win.width - EDGE - panel.width)),
	};
}

function CardMenu({ menu, items, testID, className }: CardMenuProps) {
	const win = useWindowDimensions();
	const reducedMotion = useReducedMotion();
	const [anchor, setAnchor] = React.useState<Box | null>(null);
	const [panel, setPanel] = React.useState<{ width: number; height: number } | null>(null);
	const { open, close, triggerRef } = menu;

	// Measure the trigger each time the menu opens; forget it when it closes.
	React.useEffect(() => {
		if (!open) {
			setAnchor(null);
			setPanel(null);
			return;
		}
		triggerRef.current?.measureInWindow?.((x, y, width, height) =>
			setAnchor({ x, y, width, height }),
		);
	}, [open, triggerRef]);

	// A resize (or rotation) moves the trigger out from under the panel.
	const size = `${win.width}x${win.height}`;
	const sizeRef = React.useRef(size);
	React.useEffect(() => {
		if (sizeRef.current !== size) {
			sizeRef.current = size;
			close();
		}
	}, [size, close]);

	// The chosen item's action, held until the menu's Modal has gone (iOS).
	const pending = React.useRef<(() => void) | null>(null);
	const fallback = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const runPending = React.useCallback(() => {
		if (fallback.current) clearTimeout(fallback.current);
		fallback.current = null;
		const action = pending.current;
		pending.current = null;
		action?.();
	}, []);
	// Unmounted with a choice still pending: it was still chosen.
	React.useEffect(() => runPending, [runPending]);

	const choose = (item: CardMenuItem) => {
		pending.current = item.onPress;
		close();
		if (Platform.OS === "ios") {
			fallback.current = setTimeout(runPending, DISMISS_FALLBACK_MS);
		} else {
			runPending();
		}
	};

	const placement = anchor && panel ? placePanel(anchor, panel, win) : null;

	const placed = placement !== null;

	const opacity = useSharedValue(0);
	React.useEffect(() => {
		const next = placed ? 1 : 0;
		opacity.value = reducedMotion || !placed ? next : withTiming(next, { duration: DUR.fast });
	}, [placed, reducedMotion, opacity]);
	const fade = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

	return (
		<Modal
			visible={open}
			transparent
			animationType="none"
			onRequestClose={close}
			onDismiss={runPending}
		>
			{/* The Modal is outside the root PersonPairProvider on web; the
			    panel paints only neutrals today, but a person-tinted row must
			    not quietly read the :root fallbacks (CLAUDE.md). */}
			<PersonVarsBoundary testID="card-menu-person-vars">
				<View className="flex-1" onAccessibilityEscape={close}>
					<Pressable
						testID="menu-backdrop"
						role="button"
						accessibilityLabel="Close menu"
						onPress={close}
						pressRetentionOffset={FAR}
						className="absolute inset-0"
					/>
					<AnimatedView
						className="absolute"
						style={[
							{
								top: placement?.top ?? 0,
								right: placement?.right ?? EDGE,
								maxWidth: win.width - EDGE * 2,
							},
							fade,
						]}
						onLayout={(event) => {
							const { width, height } = event.nativeEvent.layout;
							setPanel((current) =>
								current?.width === width && current.height === height ? current : { width, height },
							);
						}}
					>
						<View
							testID={testID}
							role="menu"
							style={SHADOW.float}
							className={cn("min-w-[172px] rounded-[18px] bg-surface p-1.5", className)}
						>
							{items.map((item) => (
								<Pressable
									key={item.label}
									role="menuitem"
									accessibilityLabel={item.label}
									onPress={() => choose(item)}
									className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5"
								>
									{item.icon}
									<Text
										className={cn("text-row font-medium", item.destructive ? "text-destructive" : "text-ink")}
									>
										{item.label}
									</Text>
								</Pressable>
							))}
						</View>
					</AnimatedView>
				</View>
			</PersonVarsBoundary>
		</Modal>
	);
}

export { CardMenu, CardMenuTrigger, useCardMenu, placePanel, ArchiveGlyph, DotsGlyph, TrashGlyph };
export type { CardMenuItem, CardMenuProps, CardMenuState, CardMenuTriggerProps };
