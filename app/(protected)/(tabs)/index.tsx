import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { styled, getColor, getFont } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { useUserContext } from "@/context/user-context-provider";
import { Text } from "@/components/ui/Text";
import { ContentLayout, ResponsiveCardList } from "@/components/layout";
import { FixedFooter } from "@/components/layout/FixedFooter";
import { CircleButton, PrimaryButton } from "@/components/ui/Button";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconAdd } from "@/assets/icons/IconAdd";
import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import { WelcomeCard } from "@/components/ui/WelcomeCard";
import { WELCOME_DECISION, PARTNER_INTRO } from "@/lib/welcomeDecisionContent";
import { useDecisionsData } from "@/hooks/decision-queue/useDecisionsData";
import { useDecisionVoting } from "@/hooks/decision-queue/useDecisionVoting";
import { useDecisionManagement } from "@/hooks/decision-queue/useDecisionManagement";
import { useOptionLists } from "@/context/option-lists-provider";
import {
	getSeenWelcomeDecision,
	setSeenWelcomeDecision,
	getSeenPartnerIntro,
	setSeenPartnerIntro,
} from "@/lib/onboardingStorage";

const TitleContainer = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 28px;
`;

const TitleText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("headingBold")};
	font-size: 24px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const DecisionsContainer = styled.View`
	gap: 20px;
`;

const CustomCircleButton = styled(CircleButton)<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("tertiary", colorMode)};
`;

/** Transparent wrapper so corner illustrations show through; cards have opaque backgrounds. */
const ContentContainer = styled.View<{ colorMode: "light" | "dark" }>`
	flex: 1;
	background-color: transparent;
`;

export default function Home() {
	const { colorMode } = useTheme();
	const {
		showDrawer,
		hideDrawer,
		updateContent,
		isVisible: isDrawerVisible,
		drawerType,
	} = useDrawer();
	const { userContext } = useUserContext();

	// Data loading and subscriptions
	const { decisions, setDecisions, pollVotes, setPollVotes, loading, error, setError } =
		useDecisionsData(userContext);

	// Option lists from provider
	const { optionLists } = useOptionLists();

	// Voting logic
	const { voting, handleVote, handlePollVote, selectOption } = useDecisionVoting(
		userContext,
		decisions,
		setDecisions,
		setPollVotes,
		setError,
	);

	// CRUD operations
	const {
		creating,
		createNewDecision,
		updateExistingDecision,
		updateDecisionInline,
		deleteExistingDecision,
		updateOptions,
	} = useDecisionManagement(userContext, setDecisions, setError);

	// Onboarding flags (AsyncStorage) - null = not loaded yet
	const [seenWelcomeDecision, setSeenWelcomeDecisionState] = useState<boolean | null>(null);
	const [seenPartnerIntro, setSeenPartnerIntroState] = useState<boolean | null>(null);

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

	const handleCancelEdit = useCallback(() => {
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
	}, [hideDrawer]);

	const handleCreateOrUpdate = useCallback(async () => {
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
	}, [
		editingDecisionId,
		formData,
		updateExistingDecision,
		createNewDecision,
		hideDrawer,
		handleCancelEdit,
	]);

	const renderCreateDecisionContent = useCallback(
		() => (
			<CreateDecisionForm
				formData={formData}
				onFormDataChange={setFormData}
				onSubmit={handleCreateOrUpdate}
				onCancel={handleCancelEdit}
				isEditing={!!editingDecisionId}
				isSubmitting={creating}
				optionLists={optionLists}
			/>
		),
		[formData, handleCreateOrUpdate, handleCancelEdit, editingDecisionId, creating, optionLists],
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
		showDrawer("Create Decision", renderCreateDecisionContent(), { type: "createDecision" });
	}, [showDrawer, renderCreateDecisionContent]);

	// Load onboarding flags from AsyncStorage
	useEffect(() => {
		if (!userContext?.userId) return;
		let cancelled = false;
		(async () => {
			const [welcome, partnerIntro] = await Promise.all([
				getSeenWelcomeDecision(userContext.userId),
				getSeenPartnerIntro(userContext.userId),
			]);
			if (!cancelled) {
				setSeenWelcomeDecisionState(welcome);
				setSeenPartnerIntroState(partnerIntro);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [userContext?.userId]);

	// Update drawer content when drawer opens or form data changes
	useEffect(() => {
		if (isDrawerVisible && drawerType === "createDecision") {
			updateContent(renderCreateDecisionContent());
		}
	}, [formData, updateContent, isDrawerVisible, drawerType]);

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

	const handleDismissWelcome = useCallback(async () => {
		if (!userContext?.userId) return;
		await setSeenWelcomeDecision(userContext.userId);
		setSeenWelcomeDecisionState(true);
	}, [userContext?.userId]);

	const handleDismissPartnerIntro = useCallback(async () => {
		if (!userContext?.userId) return;
		await setSeenPartnerIntro(userContext.userId);
		setSeenPartnerIntroState(true);
	}, [userContext?.userId]);

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
			<ContentContainer colorMode={colorMode}>
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

					{/* Partner intro: second user who just joined, has partner and decisions */}
					{!loading && decisions.length > 0 && userContext?.partnerId && seenPartnerIntro === false && (
						<DecisionsContainer>
							<WelcomeCard
								title={PARTNER_INTRO.title}
								description={PARTNER_INTRO.description}
								options={PARTNER_INTRO.options}
								onDismiss={handleDismissPartnerIntro}
							/>
						</DecisionsContainer>
					)}

					{/* Empty state: welcome card for first-time user */}
					{!loading && decisions.length === 0 && seenWelcomeDecision === false && userContext && (
						<DecisionsContainer>
							<WelcomeCard
								title={WELCOME_DECISION.title}
								description={WELCOME_DECISION.description}
								options={WELCOME_DECISION.options}
								onDismiss={handleDismissWelcome}
							/>
						</DecisionsContainer>
					)}

					<ResponsiveCardList>
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
									options={decision.options || []}
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
									onEditDecision={(payload) => updateDecisionInline(decision.id, payload)}
								/>
							);
						})}
					</ResponsiveCardList>
				</ContentLayout>
			</ContentContainer>

			<FixedFooter background="transparent">
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
