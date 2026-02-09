// Export all icons from a single index file for easy importing

// Legacy icon exports (kebab-case files)
export { HomeIcon } from "./home";
export { ArrowRightIcon } from "./arrow-right";
export { PlusIcon } from "./plus";
export { MenuIcon } from "./menu";
export { XIcon } from "./x";
export { ShuffleIcon } from "./shuffle";
export { CopyIcon } from "./copy";

// Modern icon exports (Icon prefixed files)
export { IconAdd } from "./IconAdd";
export { IconArrowBack } from "./IconArrowBack";
export { IconArrowForward } from "./IconArrowForward";
export { IconBallot } from "./IconBallot";
export { IconBlock } from "./IconBlock";
export { IconChevronDown } from "./IconChevronDown";
export { IconChevronUp } from "./IconChevronUp";
export { IconCircleNotch } from "./IconCircleNotch";
export { IconClose } from "./IconClose";
export { IconDone } from "./IconDone";
export { IconEditNote } from "./IconEditNote";
export { IconGavel } from "./IconGavel";
export { IconHeart } from "./IconHeart";
export { IconHouseChimney } from "./IconHouseChimney";
export { IconList } from "./IconList";
export { IconPottedPlant } from "./IconPottedPlant";
export { IconPoll } from "./IconPoll";
export { IconQueue } from "./IconQueue";
export { IconRadioButtonChecked } from "./IconRadioButtonChecked";
export { IconRadioButtonUnchecked } from "./IconRadioButtonUnchecked";
export { IconRule } from "./IconRule";
export { IconThumbUpAlt } from "./IconThumbUpAlt";
export { IconTrashCan } from "./IconTrashCan";
export { IconUnfoldLess } from "./IconUnfoldLess";
export { IconUnfoldMore } from "./IconUnfoldMore";

// Export common icon props interface
export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
}
