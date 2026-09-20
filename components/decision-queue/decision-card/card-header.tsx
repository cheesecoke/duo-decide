import * as React from "react";
import { Pressable, TextInput, View, type PressableProps } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";
import { usePersonColors } from "@/theme/usePersonColors";

import {
	COPY,
	type Badge,
	type BadgeTone,
	type DecisionMode,
	type DecisionRound,
	type Person,
	type RoundTone,
} from "./decision-card.model";
import {
	CheckGlyph,
	ChevronGlyph,
	CloseGlyph,
	DotsGlyph,
	PencilGlyph,
	PollGlyph,
	TrashGlyph,
	VoteGlyph,
} from "./glyphs";

/**
 * Everything above the fold, and the whole of a collapsed card
 * (FEATURE-INVENTORY §1.10a — "Collapsed cards show *only* title, mode icon,
 * badge, created-by, deadline, chevron").
 *
 * The signal row carries link two of tokens.md §10's round-colour thread: the
 * segment indicator. The badge deliberately does not — §10 lists exactly four
 * places the round colour goes and the badge is not one of them, so it wears
 * the person state instead (whose card this is), which is what the round-3
 * mock's `badge()` does.
 */

type CardHeaderProps = {
	title: string;
	mode: DecisionMode;
	round: DecisionRound;
	tone: RoundTone;
	badge: Badge;
	createdBy: Person;
	deadline: Date | null;
	expanded: boolean;
	editing: boolean;
	/** Creator + pending: FEATURE-INVENTORY §1.10a, DecisionCardHeader.tsx:243. */
	canEdit: boolean;
	isCreator: boolean;
	draftTitle: string;
	onDraftTitle: (value: string) => void;
	onToggle: () => void;
	onEdit: () => void;
	onCancelEdit: () => void;
	onSave: () => void;
	onDelete: () => void;
};

const CHEVRON_TURN = 180;

/** Badge fills. `together` is a gradient and gets a layer instead of a class. */
const BADGE_FILL: Record<BadgeTone, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	together: "bg-surface-2",
	neutral: "bg-surface-2",
};

const BADGE_TEXT: Record<BadgeTone, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
	together: "text-ink",
	neutral: "text-ink-2",
};

/**
 * A round's own hue, whichever round the card is currently on — round 1 is
 * always person A's and round 2 always person B's, so a finished segment
 * keeps the colour of *its* round rather than borrowing the live one. (A
 * round-2 card showing two person-B bars would say the wrong thing about
 * round 1.)
 */
const SEG_ROUND: Record<DecisionRound, RoundTone> = { 1: "a", 2: "b", 3: "together" };

/** Segment fills: a finished round in its tint, the live one in its base. */
const SEG_DONE: Record<RoundTone, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	together: "bg-person-a-tint",
	neutral: "bg-line",
};

const SEG_ACTIVE: Record<RoundTone, string> = {
	a: "bg-person-a-base",
	b: "bg-person-b-base",
	together: "bg-person-a-base",
	neutral: "bg-ink-2",
};

const SEG = "h-[3px] w-[13px] rounded-sm";
const FILL = { flex: 1 } as const;

/** DecisionCardHeader.tsx:141-152 — "Mon D, YYYY", or the literal fallback. */
function formatDeadline(deadline: Date | null): string {
	if (!deadline) return COPY.noDeadline;
	return deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** A 30 px circle in `surface-2`, the mock's `.iconbtn`. */
function IconButton({
	label,
	onPress,
	children,
	className,
	accessibilityState,
}: {
	label: string;
	onPress: () => void;
	children: React.ReactNode;
	className?: string;
	accessibilityState?: PressableProps["accessibilityState"];
}) {
	return (
		<Pressable
			role="button"
			accessibilityLabel={label}
			accessibilityState={accessibilityState}
			onPress={onPress}
			className={cn(
				"h-[30px] w-[30px] items-center justify-center rounded-chip bg-surface-2",
				className,
			)}
		>
			{children}
		</Pressable>
	);
}

/**
 * The 3-segment round indicator. Round 3 is drawn as a hard A | A-to-B | B
 * split rather than a blend, because it is the round that belongs to both of
 * them (tokens.md §10). A vote card has one round, so it gets one segment.
 */
function RoundSegments({
	mode,
	round,
	tone,
}: {
	mode: DecisionMode;
	round: DecisionRound;
	tone: RoundTone;
}) {
	const person = usePersonColors();

	if (mode === "vote") {
		return (
			<View testID="decision-card-segments" className="flex-row gap-[3px]">
				<View className={cn(SEG, SEG_ACTIVE[tone])} />
			</View>
		);
	}

	if (round === 3) {
		return (
			<View testID="decision-card-segments" className="flex-row gap-[3px]">
				<View className={cn(SEG, "bg-person-a-base")} />
				<View className={cn(SEG, "overflow-hidden")}>
					<LinearGradient
						colors={[person.a.base, person.b.base]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={FILL}
					/>
				</View>
				<View className={cn(SEG, "bg-person-b-base")} />
			</View>
		);
	}

	return (
		<View testID="decision-card-segments" className="flex-row gap-[3px]">
			{([1, 2, 3] as const).map((index) => (
				<View
					key={index}
					className={cn(
						SEG,
						index < round ? SEG_DONE[SEG_ROUND[index]] : index === round ? SEG_ACTIVE[tone] : "bg-line",
					)}
				/>
			))}
		</View>
	);
}

function StatusBadge({ label, tone }: Badge) {
	const person = usePersonColors();

	return (
		<View
			testID="decision-card-badge"
			className={cn("relative overflow-hidden rounded-chip px-[11px] py-1", BADGE_FILL[tone])}
		>
			{tone === "together" ? (
				<View pointerEvents="none" className="absolute inset-0">
					<LinearGradient
						colors={[person.a.tint, person.b.tint]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={FILL}
					/>
				</View>
			) : null}
			<TextClassContext.Provider
				value={cn("text-[13px] font-semibold leading-[18px]", BADGE_TEXT[tone])}
			>
				<Text>{label}</Text>
			</TextClassContext.Provider>
		</View>
	);
}

function CardHeader({
	title,
	mode,
	round,
	tone,
	badge,
	createdBy,
	deadline,
	expanded,
	editing,
	canEdit,
	isCreator,
	draftTitle,
	onDraftTitle,
	onToggle,
	onEdit,
	onCancelEdit,
	onSave,
	onDelete,
}: CardHeaderProps) {
	const reducedMotion = useReducedMotion();
	const [menuOpen, setMenuOpen] = React.useState(false);

	const turn = useSharedValue(expanded ? CHEVRON_TURN : 0);
	React.useEffect(() => {
		const next = expanded ? CHEVRON_TURN : 0;
		turn.value = reducedMotion ? next : withTiming(next, { duration: DUR.base });
	}, [expanded, reducedMotion, turn]);

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts).
	const chevronStyle = useAnimatedStyle(
		() => ({ transform: [{ rotate: `${turn.value}deg` }] }),
		[turn],
	);

	const ModeGlyph = mode === "poll" ? PollGlyph : VoteGlyph;

	return (
		<>
			<View className="flex-row items-start gap-2.5">
				<View className="min-w-0 flex-1">
					{editing ? (
						<TextInput
							accessibilityLabel="Title"
							value={draftTitle}
							onChangeText={onDraftTitle}
							className="rounded-field bg-surface-2 px-3.5 py-2.5 text-[16px] leading-[22px] text-ink"
						/>
					) : (
						// tokens.md §10 eye flow: a collapsed card is quieter,
						// so its title steps back to ink-2.
						<Title className={cn(!expanded && "text-ink-2")}>{title}</Title>
					)}
				</View>

				<View className="flex-row items-center gap-1.5">
					{editing ? (
						<>
							<IconButton label="Cancel edit" onPress={onCancelEdit}>
								<CloseGlyph color={NEUTRAL.ink2} />
							</IconButton>
							<IconButton label="Save edit" onPress={onSave} className="bg-person-a-tint">
								<CheckGlyph color={NEUTRAL.ink} />
							</IconButton>
						</>
					) : (
						<>
							{canEdit ? (
								<IconButton label="Edit decision" onPress={onEdit}>
									<PencilGlyph />
								</IconButton>
							) : null}
							{isCreator ? (
								<IconButton label="More" onPress={() => setMenuOpen((open) => !open)}>
									<DotsGlyph />
								</IconButton>
							) : null}
							<IconButton
								label={expanded ? "Collapse" : "Expand"}
								accessibilityState={{ expanded }}
								onPress={onToggle}
							>
								<AnimatedView style={chevronStyle}>
									<ChevronGlyph />
								</AnimatedView>
							</IconButton>
						</>
					)}
				</View>
			</View>

			{menuOpen && !editing ? (
				<View
					testID="decision-card-menu"
					style={SHADOW.float}
					className="absolute right-3.5 top-[52px] z-10 min-w-[172px] rounded-[18px] bg-surface p-1.5"
				>
					<Pressable
						role="button"
						accessibilityLabel="Delete decision"
						onPress={() => {
							setMenuOpen(false);
							onDelete();
						}}
						className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5"
					>
						<TrashGlyph />
						<Text className="text-row font-medium text-destructive">Delete decision</Text>
					</Pressable>
				</View>
			) : null}

			{editing ? null : (
				<>
					<View className="mt-2.5 flex-row flex-wrap items-center gap-2">
						<View className="flex-row items-center gap-[7px] rounded-chip bg-surface-2 px-[11px] py-1">
							<ModeGlyph size={14} color={NEUTRAL.ink2} />
							<RoundSegments mode={mode} round={round} tone={tone} />
						</View>
						{/* DecisionCardHeader.tsx:272 — the badge hides while editing. */}
						<StatusBadge label={badge.label} tone={badge.tone} />
					</View>

					<View className="mt-2.5 flex-row flex-wrap items-center gap-1.5">
						<Caption className="text-ink-3">{COPY.createdBy(createdBy.name)}</Caption>
						<Caption className="text-ink-3">·</Caption>
						<Caption className="text-ink-3">{formatDeadline(deadline)}</Caption>
					</View>
				</>
			)}
		</>
	);
}

export { CardHeader, IconButton, formatDeadline };
export type { CardHeaderProps };
