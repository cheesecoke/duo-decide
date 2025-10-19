import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { Text } from "@/components/ui/Text";
import ContentLayout from "@/components/layout/ContentLayout";
import { CircleButton, PrimaryButton } from "@/components/ui/Button";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconAdd } from "@/assets/icons/IconAdd";
import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "./decision-queue/components/CreateDecisionForm";
import { useDecisionsData } from "./decision-queue/hooks/useDecisionsData";
import { useDecisionVoting } from "./decision-queue/hooks/useDecisionVoting";
import { useDecisionManagement } from "./decision-queue/hooks/useDecisionManagement";

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

const FixedFooter = styled.View<{
	colorMode: "light" | "dark";
}>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 16px;
	align-items: center;
	width: 100%;
	max-width: 786px;
	margin: 0 auto;
`;

const ContentContainer = styled.View`
	flex: 1;
	padding-bottom: 72px;
`;

export default function Home() {
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer, updateContent } = useDrawer();

	// Data loading and subscriptions
	const { decisions, setDecisions, userContext, pollVotes, setPollVotes, loading, error, setError } =
		useDecisionsData();

	// Voting logic
	const { voting, handleVote, handlePollVote, selectOption } = useDecisionVoting(
		userContext,
		decisions,
		setDecisions,
		setPollVotes,
		setError,
	);

	// CRUD operations
	const { creating, createNewDecision, updateExistingDecision, deleteExistingDecision, updateOptions } =
		useDecisionManagement(userContext, setDecisions, setError);

	// Local UI state
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
	const [formData, setFormData] = useState<CreateDecisionFormData>({
		title: "",
		description: "",
		dueDate: "",
		decisionType: "vote",
		selectedOptionListId: "",
		selectedOptions: [],
		customOptions: [],
	});

	const renderCreateDecisionContent = () => (
		<CreateDecisionForm
			formData={formData}
			onFormDataChange={setFormData}
			onSubmit={handleCreateOrUpdate}
			onCancel={handleCancelEdit}
			isEditing={!!editingDecisionId}
			isSubmitting={creating}
		/>
	);

	const showCreateDecisionDrawer = useCallback(() => {
		setEditingDecisionId(null);
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
			selectedOptionListId: "",
			selectedOptions: [],
			customOptions: [],
		});
		showDrawer("Create Decision", renderCreateDecisionContent());
	}, [showDrawer, renderCreateDecisionContent]);

	// Update drawer content when form data changes
	useEffect(() => {
		updateContent(renderCreateDecisionContent());
	}, [formData, updateContent]);

	// UI state handlers
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

	const handleCancelEdit = () => {
		hideDrawer();
		setEditingDecisionId(null);
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
			selectedOptionListId: "",
			selectedOptions: [],
			customOptions: [],
		});
	};

	const handleCreateOrUpdate = async () => {
		if (editingDecisionId) {
			const success = await updateExistingDecision(editingDecisionId, formData);
			if (success) {
				hideDrawer();
				handleCancelEdit();
			}
		} else {
			const newDecision = await createNewDecision(formData);
			if (newDecision) {
				hideDrawer();
				handleCancelEdit();
			}
		}
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
		<View style={{ flex: 1 }}>
			<ContentContainer>
				<ContentLayout scrollable={true}>
					{error && (
						<View
							style={{
								backgroundColor: getColor("destructive", colorMode),
								padding: 12,
								borderRadius: 8,
								marginBottom: 16,
							}}
						>
							<Text style={{ color: getColor("background", colorMode), textAlign: "center" }}>
								{error}
							</Text>
						</View>
					)}

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
						{decisions.map((decision) => {
							if (!userContext) return null;

							// Get votes for the current round to determine button state
							const currentRoundVotes = pollVotes[decision.id] || {};

							return (
								<CollapsibleCard
									key={decision.id}
									title={decision.title}
									createdBy={decision.createdBy}
									userName={userContext.userName}
									partnerName={userContext.partnerName || "Partner"}
									deadline={decision.deadline || ""}
									details={decision.details || ""}
									options={decision.options}
									expanded={decision.expanded}
									status={decision.status}
									decidedBy={decision.decidedBy}
									decidedAt={decision.decidedAt || undefined}
									loading={voting === decision.id}
									mode={decision.type}
									currentRound={(decision.current_round || 1) as 1 | 2 | 3}
									pollVotes={currentRoundVotes}
									onToggle={() => handleToggleDecision(decision.id)}
									onDecide={
										decision.type === "poll"
											? () => handlePollVote(decision.id)
											: (optionId: string) => handleVote(decision.id, optionId)
									}
									onDelete={() => deleteExistingDecision(decision.id)}
									onOptionSelect={(optionId: string) => selectOption(decision.id, optionId)}
									onUpdateOptions={(newOptions) => updateOptions(decision.id, newOptions)}
									onPollVote={(optionId: string) => selectOption(decision.id, optionId)}
									onEditDecision={() => {}}
								/>
							);
						})}
					</DecisionsContainer>
				</ContentLayout>
			</ContentContainer>

			<FixedFooter colorMode={colorMode}>
				<PrimaryButton colorMode={colorMode} onPress={showCreateDecisionDrawer}>
					<IconAdd size={16} color={getColor("yellowForeground", colorMode)} />
					<Text
						style={{
							color: getColor("yellowForeground", colorMode),
							fontWeight: "500",
							fontSize: 16,
							marginLeft: 8,
						}}
					>
						Create Decision
					</Text>
				</PrimaryButton>
			</FixedFooter>
		</View>
	);
}
