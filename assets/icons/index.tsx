// Export all icons from a single index file for easy importing
export { HomeIcon } from "./home";
export { ArrowRightIcon } from "./arrow-right";
export { PlusIcon } from "./plus";
export { MenuIcon } from "./menu";
export { XIcon } from "./x";
export { ShuffleIcon } from "./shuffle";
export { CopyIcon } from "./copy";

// Export common icon props interface
export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
}
