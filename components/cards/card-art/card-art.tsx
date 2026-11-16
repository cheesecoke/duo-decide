import * as React from "react";
import { View } from "react-native";
import {
	AirplaneTilt,
	Armchair,
	Bread,
	Broom,
	CalendarCheck,
	Car,
	Confetti,
	CookingPot,
	Devices,
	EnvelopeOpen,
	FirstAidKit,
	FlowerLotus,
	ForkKnife,
	Gift,
	HandCoins,
	HandHeart,
	Handshake,
	HandsPraying,
	Heart,
	House,
	Images,
	Key,
	Mailbox,
	PawPrint,
	Pill,
	Plant,
	Receipt,
	Recycle,
	Scroll,
	ShoppingCart,
	Signpost,
	SprayBottle,
	Stethoscope,
	Tag,
	Tent,
	Ticket,
	ToiletPaper,
	TShirt,
	UsersThree,
	WashingMachine,
	Wine,
	Wrench,
	type Icon,
} from "phosphor-react-native";

import type { CardCategory } from "@/lib/responsibility-deck";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * CardArt: the picture on a responsibility card.
 *
 * A duotone Phosphor glyph on a round plate. The plate and the glyph take the
 * holder's colours (tokens.md §2: `tint` behind, `deep` on top), so the art is
 * the loudest "whose is this" on the card; a card nobody holds is drawn in the
 * neutrals.
 *
 * Starter-deck cards have their own picture, keyed by `deck_key`
 * (lib/responsibility-deck.ts). A card the couple wrote has no key and gets
 * its category's picture.
 *
 * Decorative: the card's own label already says what it is, so the art is
 * hidden from screen readers.
 */

type ArtSeat = "a" | "b" | "none";

const DECK_ART: Record<string, Icon> = {
	trash: Recycle,
	groceries: ShoppingCart,
	"weeknight-dinners": CookingPot,
	"weekday-breakfasts": Bread,
	tidying: Broom,
	"household-supplies": ToiletPaper,
	mail: Mailbox,
	"home-repairs": Wrench,
	cleaning: SprayBottle,
	"yard-plants": Plant,
	car: Car,
	tech: Devices,
	"first-aid-safety": FirstAidKit,
	pets: PawPrint,
	"parents-in-laws": UsersThree,
	"grooming-wardrobe": TShirt,
	"self-care": FlowerLotus,
	"date-nights": Wine,
	friendships: Handshake,
	faith: HandsPraying,
	laundry: WashingMachine,
	hosting: ForkKnife,
	furnishings: Armchair,
	photos: Images,
	housing: Key,
	calendar: CalendarCheck,
	"weekend-plans": Tent,
	travel: AirplaneTilt,
	"social-plans": Ticket,
	returns: Receipt,
	rewards: Tag,
	giving: HandCoins,
	"health-insurance": Stethoscope,
	wills: Scroll,
	contraception: Pill,
	holidays: Confetti,
	"family-gifts": Gift,
	"greeting-cards": EnvelopeOpen,
};

const CATEGORY_ART: Record<CardCategory, Icon> = {
	home: House,
	out: Signpost,
	care: HandHeart,
	us: Heart,
};

/** The picture for a card: its own if it came from the starter deck, else its category's. */
function cardArtFor(deckKey: string | null | undefined, category: CardCategory): Icon {
	return (deckKey ? DECK_ART[deckKey] : undefined) ?? CATEGORY_ART[category];
}

const PLATE_CLASS: Record<ArtSeat, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	none: "bg-surface-2",
};

function CardArt({
	deckKey,
	category,
	seat,
	size = 72,
	className,
}: {
	deckKey?: string | null;
	category: CardCategory;
	seat: ArtSeat;
	/** The plate's diameter. The glyph is a little over half of it. */
	size?: number;
	className?: string;
}) {
	const person = usePersonColors();
	const Glyph = cardArtFor(deckKey, category);
	const color = seat === "a" ? person.a.deep : seat === "b" ? person.b.deep : NEUTRAL.ink2;

	return (
		<View
			testID="card-art"
			aria-hidden
			importantForAccessibility="no-hide-descendants"
			style={{ width: size, height: size }}
			className={cn("items-center justify-center rounded-chip", PLATE_CLASS[seat], className)}
		>
			<Glyph size={Math.round(size * 0.56)} color={color} weight="duotone" />
		</View>
	);
}

export { CardArt, cardArtFor, CATEGORY_ART, DECK_ART };
export type { ArtSeat };
