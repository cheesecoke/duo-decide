import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import ContentLayout from "@/components/layout/ContentLayout";
import { CircleButton } from "@/components/ui/Button";
import { CollapsibleCard } from "@/components/layout";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import {
	MOCK_DECISIONS,
	MOCK_OPTION_LISTS,
	USERS,
	simulateApiDelay,
	type Decision,
	type OptionList,
	type DecisionOption,
} from "@/data/mockData";

const TitleContainer = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
`;

const TitleText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 24px;
	font-weight: bold;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const DecisionsContainer = styled.View`
	gap: 16px;
`;

const CustomCircleButton = styled(CircleButton)<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("tertiary", colorMode)};
`;

const FormFieldContainer = styled.View`
	margin-bottom: 16px;
`;

const FieldLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 500;
	margin-bottom: 8px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const ToggleContainer = styled.View`
	flex-direction: row;
	gap: 8px;
	margin-bottom: 16px;
`;

const ToggleButton = styled(Pressable)<{
	colorMode: "light" | "dark";
	active: boolean;
}>`
	flex: 1;
	padding: 12px 16px;
	border-radius: 8px;
	align-items: center;
	background-color: ${({ active, colorMode }) =>
		active ? getColor("yellow", colorMode) : getColor("muted", colorMode)};
	border: 1px solid
		${({ active, colorMode }) =>
			active ? getColor("yellow", colorMode) : getColor("border", colorMode)};
`;

const ToggleButtonText = styled.Text<{
	colorMode: "light" | "dark";
	active: boolean;
}>`
	font-weight: 500;
	color: ${({ active, colorMode }) =>
		active ? getColor("yellowForeground", colorMode) : getColor("foreground", colorMode)};
`;

const SelectorContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const SelectorItem = styled.Pressable<{
	colorMode: "light" | "dark";
	isSelected: boolean;
}>`
	padding: 12px 16px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
	background-color: ${({ isSelected, colorMode }) =>
		isSelected ? getColor("muted", colorMode) : "transparent"};
`;

const SelectorItemText = styled.Text<{
	colorMode: "light" | "dark";
	isSelected: boolean;
}>`
	font-size: 14px;
	font-weight: ${({ isSelected }) => (isSelected ? "500" : "400")};
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const SelectorDescription = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	margin-top: 2px;
`;

export default function DecisionQueue() {
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer, updateContent } = useDrawer();
	const [decisions, setDecisions] = useState<Decision[]>([]);
	const [loading, setLoading] = useState(true);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		dueDate: "",
		decisionType: "vote" as "poll" | "vote",
		selectedOptionListId: "" as string,
		selectedOptions: [] as DecisionOption[],
	});

	const showCreateDecisionDrawer = useCallback(() => {
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
			selectedOptionListId: "",
			selectedOptions: [],
		});
		showDrawer("Create Decision", renderCreateDecisionContent());
	}, [showDrawer]);

	const handleOptionListSelect = (listId: string) => {
		console.log("Selecting option list:", listId);
		const selectedList = MOCK_OPTION_LISTS.find((list) => list.id === listId);
		console.log("Selected list:", selectedList);
		setFormData((prev) => ({
			...prev,
			selectedOptionListId: listId,
			selectedOptions: selectedList
				? selectedList.options.map((opt) => ({ ...opt, selected: false }))
				: [],
		}));
	};

	const handleOptionToggle = (optionId: string) => {
		console.log("Toggling option:", optionId);
		setFormData((prev) => {
			const newOptions = prev.selectedOptions.map((option) =>
				option.id === optionId ? { ...option, selected: !option.selected } : option,
			);
			console.log("New options:", newOptions);
			return {
				...prev,
				selectedOptions: newOptions,
			};
		});
	};

	const renderCreateDecisionContent = () => {
		console.log("Current form data:", formData);
		return (
			<>
				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Due date</FieldLabel>
					<Input
						placeholder="Date to make decision by"
						value={formData.dueDate}
						onChangeText={(text) => setFormData((prev) => ({ ...prev, dueDate: text }))}
					/>
				</FormFieldContainer>

				<ToggleContainer>
					<ToggleButton
						colorMode={colorMode}
						active={formData.decisionType === "poll"}
						onPress={() => setFormData((prev) => ({ ...prev, decisionType: "poll" }))}
						style={{ opacity: 0.6 }}
					>
						<ToggleButtonText colorMode={colorMode} active={formData.decisionType === "poll"}>
							Poll (Coming Soon)
						</ToggleButtonText>
					</ToggleButton>
					<ToggleButton
						colorMode={colorMode}
						active={formData.decisionType === "vote"}
						onPress={() => setFormData((prev) => ({ ...prev, decisionType: "vote" }))}
					>
						<ToggleButtonText colorMode={colorMode} active={formData.decisionType === "vote"}>
							Vote
						</ToggleButtonText>
					</ToggleButton>
				</ToggleContainer>

				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Title</FieldLabel>
					<Input
						placeholder="Enter title of decision"
						value={formData.title}
						onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
					/>
				</FormFieldContainer>

				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Description</FieldLabel>
					<Textarea
						placeholder="Enter description"
						value={formData.description}
						onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
						style={{ minHeight: 96 }}
					/>
				</FormFieldContainer>

				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Select Option List (Optional)</FieldLabel>
					<SelectorContainer colorMode={colorMode}>
						<SelectorItem
							colorMode={colorMode}
							isSelected={formData.selectedOptionListId === ""}
							onPress={() =>
								setFormData((prev) => ({ ...prev, selectedOptionListId: "", selectedOptions: [] }))
							}
						>
							<SelectorItemText colorMode={colorMode} isSelected={formData.selectedOptionListId === ""}>
								No options (add manually later)
							</SelectorItemText>
						</SelectorItem>
						{MOCK_OPTION_LISTS.map((list, index) => (
							<SelectorItem
								key={list.id}
								colorMode={colorMode}
								isSelected={formData.selectedOptionListId === list.id}
								onPress={() => handleOptionListSelect(list.id)}
								style={index === MOCK_OPTION_LISTS.length - 1 ? { borderBottomWidth: 0 } : {}}
							>
								<SelectorItemText
									colorMode={colorMode}
									isSelected={formData.selectedOptionListId === list.id}
								>
									{list.title}
								</SelectorItemText>
								<SelectorDescription colorMode={colorMode}>{list.description}</SelectorDescription>
							</SelectorItem>
						))}
					</SelectorContainer>
				</FormFieldContainer>

				{formData.selectedOptionListId && formData.selectedOptions.length > 0 && (
					<FormFieldContainer>
						<FieldLabel colorMode={colorMode}>
							Select Options ({formData.selectedOptions.filter((opt) => opt.selected).length} selected)
						</FieldLabel>
						<SelectorContainer colorMode={colorMode}>
							{formData.selectedOptions.map((option, index) => (
								<SelectorItem
									key={option.id}
									colorMode={colorMode}
									isSelected={option.selected}
									onPress={() => handleOptionToggle(option.id)}
									style={index === formData.selectedOptions.length - 1 ? { borderBottomWidth: 0 } : {}}
								>
									<SelectorItemText colorMode={colorMode} isSelected={option.selected}>
										{option.title}
									</SelectorItemText>
								</SelectorItem>
							))}
						</SelectorContainer>
					</FormFieldContainer>
				)}

				<FormFieldContainer>
					<Button variant="default" onPress={handleCreateFromDrawer} disabled={!formData.title.trim()}>
						Create Decision
					</Button>
				</FormFieldContainer>

				<Button variant="outline" onPress={hideDrawer}>
					Cancel
				</Button>
			</>
		);
	};

	useEffect(() => {
		// Simulate loading and set decisions
		const loadDecisions = async () => {
			setLoading(true);
			await simulateApiDelay(500);
			setDecisions(MOCK_DECISIONS);
			setLoading(false);
		};

		loadDecisions();
	}, []);

	// Update drawer content when form data changes
	useEffect(() => {
		updateContent(renderCreateDecisionContent());
	}, [formData, updateContent]);

	const handleToggleDecision = (decisionId: string) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId ? { ...decision, expanded: !decision.expanded } : decision,
			),
		);
	};

	const handleToggleAll = () => {
		const newCollapsedState = !allCollapsed;
		setAllCollapsed(newCollapsedState);
		setDecisions((prev) => prev.map((decision) => ({ ...decision, expanded: !newCollapsedState })));
	};

	const handleDecide = (decisionId: string, optionId: string) => {
		const selectedOption = decisions
			.find((d) => d.id === decisionId)
			?.options.find((o) => o.id === optionId);

		if (selectedOption) {
			setDecisions((prev) =>
				prev.map((decision) =>
					decision.id === decisionId
						? {
								...decision,
								status: "completed" as const,
								decidedBy: "You",
								decidedAt: new Date().toISOString(),
							}
						: decision,
				),
			);
		}
	};

	const handleOptionSelect = (decisionId: string, optionId: string) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId
					? {
							...decision,
							options: decision.options.map((option) =>
								option.id === optionId ? { ...option, selected: true } : { ...option, selected: false },
							),
						}
					: decision,
			),
		);
	};

	const handleDelete = (decisionId: string) => {
		setDecisions((prev) => prev.filter((decision) => decision.id !== decisionId));
	};

	const handleCreateFromDrawer = () => {
		if (!formData.title.trim()) return;

		// Get selected options from the form
		const selectedOptions = formData.selectedOptions.filter((opt) => opt.selected);
		const options =
			selectedOptions.length > 0 ? selectedOptions.map((opt) => ({ ...opt, selected: false })) : [];

		const newDecision: Decision = {
			id: Date.now().toString(),
			title: formData.title,
			createdBy: USERS.YOU, // In a real app, this would be the current user
			deadline: formData.dueDate,
			details: formData.description,
			expanded: false,
			options: options,
			optionListId: formData.selectedOptionListId || undefined,
			status: "pending",
			createdAt: new Date().toISOString(),
		};

		setDecisions((prev) => [newDecision, ...prev]);
		hideDrawer();

		// Reset form
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
			selectedOptionListId: "",
			selectedOptions: [],
		});
	};

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
					<Text>Loading decisions...</Text>
				</View>
			</ContentLayout>
		);
	}

	return (
		<ContentLayout scrollable={true}>
			<TitleContainer>
				<TitleText colorMode={colorMode}>Decision Queue</TitleText>
				<CustomCircleButton colorMode={colorMode} onPress={handleToggleAll}>
					{allCollapsed ? (
						<IconUnfoldMore size={20} color="white" />
					) : (
						<IconUnfoldLess size={20} color="white" />
					)}
				</CustomCircleButton>
			</TitleContainer>

			<DecisionsContainer>
				{decisions.map((decision) => (
					<CollapsibleCard
						key={decision.id}
						title={decision.title}
						createdBy={decision.createdBy}
						deadline={decision.deadline}
						details={decision.details}
						options={decision.options}
						expanded={decision.expanded}
						status={decision.status}
						decidedBy={decision.decidedBy}
						decidedAt={decision.decidedAt}
						onToggle={() => handleToggleDecision(decision.id)}
						onDecide={(optionId: string) => handleDecide(decision.id, optionId)}
						onDelete={() => handleDelete(decision.id)}
						onOptionSelect={(optionId: string) => handleOptionSelect(decision.id, optionId)}
					/>
				))}
			</DecisionsContainer>
		</ContentLayout>
	);
}
