import * as React from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { CONTROL_MAX_FONT_SCALE, Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";

/**
 * Notice — a quiet, inline "here is something you should know", with up to
 * two things to do about it.
 *
 * The two blocks the app already had both shout: `ErrorStrip`
 * (components/layout) is a `destructive` pill for a screen-level failure, and
 * the auth `StatusCard`'s error tone is a `destructive-tint` panel. Neither
 * fits "Steph just opened this in Google Calendar. Hold off so it doesn't
 * land twice.", which is not an error and should not look like one. This is a
 * neutral `surface-2` slab in `ink`, with no red anywhere.
 *
 * ## Role
 *
 * `role="status"` by default: read out politely, when the screen reader gets
 * to it. Pass `urgent` for something that just failed ("We couldn't open
 * Google Calendar."): the same quiet slab, announced as `role="alert"`,
 * because the thing the person just asked for did not happen.
 *
 * ## Actions
 *
 * At most two; a third is dropped (and warned about in dev). They are small
 * `surface` pills on the slab, 44 pt tall, and wrap under each other when the
 * labels do not fit on one line.
 *
 * It fades in over `dur.base`, from a shared value rather than
 * `entering={FadeIn}` for the reason spelled out in error-strip.tsx, and is
 * simply there under reduce-motion.
 */

type NoticeAction = {
	label: string;
	onPress: () => void;
	/** Defaults to `label`. */
	accessibilityLabel?: string;
	disabled?: boolean;
};

type NoticeProps = {
	/** An optional bold first line. */
	title?: string;
	message: string;
	/** Up to two. */
	actions?: NoticeAction[];
	/** Announce as `role="alert"`: something the person asked for just failed. */
	urgent?: boolean;
	className?: string;
	testID?: string;
};

const MAX_ACTIONS = 2;

function Notice({
	title,
	message,
	actions = [],
	urgent = false,
	className,
	testID = "notice",
}: NoticeProps) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	React.useEffect(() => {
		progress.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.base });
	}, [progress, reducedMotion]);

	// The dependency array is required: Reanimated's Babel plugin does not run
	// in Storybook's vite pipeline (see .storybook/main.ts).
	const style = useAnimatedStyle(() => ({ opacity: progress.value }), [progress]);

	if (__DEV__ && actions.length > MAX_ACTIONS) {
		console.warn(`Notice takes at most ${MAX_ACTIONS} actions; ${actions.length} were given.`);
	}
	const shown = actions.slice(0, MAX_ACTIONS);

	return (
		<AnimatedView
			testID={testID}
			role={urgent ? "alert" : "status"}
			style={style}
			className={cn("gap-3 rounded-field bg-surface-2 p-3.5", className)}
		>
			<View className="gap-1">
				{title ? <Body className="font-semibold">{title}</Body> : null}
				{/* Full `ink`, not the caption's `ink-2`: this is the one line the
				    slab exists to say. */}
				<Caption className="text-ink">{message}</Caption>
			</View>

			{shown.length > 0 ? (
				<View className="flex-row flex-wrap gap-2">
					{shown.map((action) => (
						<Pressable
							key={action.label}
							role="button"
							accessibilityLabel={action.accessibilityLabel ?? action.label}
							accessibilityState={{ disabled: Boolean(action.disabled) }}
							disabled={action.disabled}
							onPress={action.onPress}
							className={cn(
								"min-h-[44px] max-w-full items-center justify-center rounded-chip bg-surface px-4 py-2",
								action.disabled && "opacity-50",
							)}
						>
							<Text
								maxFontSizeMultiplier={CONTROL_MAX_FONT_SCALE}
								className="text-center text-[14px] font-semibold leading-5 text-ink"
							>
								{action.label}
							</Text>
						</Pressable>
					))}
				</View>
			) : null}
		</AnimatedView>
	);
}

export { Notice };
export type { NoticeAction, NoticeProps };
