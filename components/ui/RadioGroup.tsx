import * as RadioGroupPrimitive from "@rn-primitives/radio-group";
import * as React from "react";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledRadioGroupRoot = styled(RadioGroupPrimitive.Root)`
	gap: 8px;
`;

const StyledRadioGroupItem = styled(RadioGroupPrimitive.Item)<{
	colorMode: "light" | "dark";
	disabled?: boolean;
}>`
	aspect-ratio: 1;
	height: 20px;
	width: 20px;
	border-radius: 10px;
	justify-content: center;
	align-items: center;
	border: 1px solid ${({ colorMode }) => getColor("primary", colorMode)};
	color: ${({ colorMode }) => getColor("primary", colorMode)};

	${({ disabled }) =>
		disabled &&
		`
		opacity: 0.5;
	`}
`;

const StyledRadioGroupIndicator = styled(RadioGroupPrimitive.Indicator)`
	display: flex;
	align-items: center;
	justify-content: center;
`;

const StyledIndicatorView = styled.View<{
	colorMode: "light" | "dark";
}>`
	aspect-ratio: 1;
	height: 10px;
	width: 10px;
	background-color: ${({ colorMode }) => getColor("primary", colorMode)};
	border-radius: 5px;
`;

const RadioGroup = React.forwardRef<RadioGroupPrimitive.RootRef, RadioGroupPrimitive.RootProps>(
	({ ...props }, ref) => {
		return <StyledRadioGroupRoot {...props} ref={ref} />;
	},
);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<RadioGroupPrimitive.ItemRef, RadioGroupPrimitive.ItemProps>(
	({ ...props }, ref) => {
		const { colorMode } = useTheme();

		return (
			<StyledRadioGroupItem ref={ref} colorMode={colorMode} disabled={props.disabled} {...props}>
				<StyledRadioGroupIndicator>
					<StyledIndicatorView colorMode={colorMode} />
				</StyledRadioGroupIndicator>
			</StyledRadioGroupItem>
		);
	},
);
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
