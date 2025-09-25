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

interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

interface Decision {
	id: string;
	title: string;
	createdBy: string;
	deadline: string;
	details: string;
	options: DecisionOption[];
	expanded: boolean;
}

export default function DecisionQueue() {
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer } = useDrawer();
	const [decisions, setDecisions] = useState<Decision[]>([]);
	const [loading, setLoading] = useState(true);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		dueDate: "",
		decisionType: "vote" as "poll" | "vote",
	});

	// Mock data for decisions
	const mockDecisions: Decision[] = [
		{
			id: "1",
			title: "Dinner Ideas",
			createdBy: "Steph",
			deadline: "2024-01-20",
			details:
				"Choose from our curated list of fun dinner ideas for LA. Pick your favorite option to decide where we'll go for dinner tonight.",
			expanded: true,
			options: [
				{ id: "1-1", title: "Candlelit Dinner", selected: false },
				{ id: "1-2", title: "In & Out", selected: false },
				{ id: "1-3", title: "Home Cooked Meal", selected: false },
			],
		},
		{
			id: "2",
			title: "Date Nights",
			createdBy: "Steph",
			deadline: "2024-01-22",
			details:
				"Select from our romantic date night options. Choose the perfect evening activity for us to enjoy together.",
			expanded: false,
			options: [
				{ id: "2-1", title: "Movie Night", selected: false },
				{ id: "2-2", title: "Stargazing", selected: true },
			],
		},
		{
			id: "3",
			title: "Spur of the Moment",
			createdBy: "Steph",
			deadline: "2024-01-25",
			details:
				"Quick decision needed for a spontaneous adventure. Pick from our random ideas for an impromptu outing.",
			expanded: false,
			options: [{ id: "3-1", title: "Beach Walk", selected: false }],
		},
	];

	const showCreateDecisionDrawer = useCallback(() => {
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
		});
		showDrawer("Create Decision", renderCreateDecisionContent());
	}, [showDrawer]);

	const renderCreateDecisionContent = () => (
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
				<Button variant="default" onPress={handleCreateFromDrawer} disabled={!formData.title.trim()}>
					Create Decision
				</Button>
			</FormFieldContainer>

			<Button variant="outline" onPress={hideDrawer}>
				Cancel
			</Button>
		</>
	);

	useEffect(() => {
		// Simulate loading and set decisions
		const loadDecisions = async () => {
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 500));
			setDecisions(mockDecisions);
			setLoading(false);
		};

		loadDecisions();
	}, []);

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

	const handleDecide = (decisionId: string) => {
		console.log("Decide on decision:", decisionId);
		// TODO: Implement decision logic
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

		const newDecision: Decision = {
			id: Date.now().toString(),
			title: formData.title,
			createdBy: "You", // In a real app, this would be the current user
			deadline: formData.dueDate,
			details: formData.description,
			expanded: false,
			options: [], // Start with empty options, user can add them later
		};

		setDecisions((prev) => [newDecision, ...prev]);
		hideDrawer();

		// Reset form
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
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
						onToggle={() => handleToggleDecision(decision.id)}
						onDecide={() => handleDecide(decision.id)}
						onDelete={() => handleDelete(decision.id)}
						onOptionSelect={(optionId: string) => handleOptionSelect(decision.id, optionId)}
					/>
				))}
			</DecisionsContainer>
		</ContentLayout>
	);
}
