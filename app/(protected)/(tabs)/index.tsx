import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import ContentLayout from "@/components/layout/ContentLayout";
import { CircleButton, PrimaryButton } from "@/components/ui/Button";
import { CollapsibleCard } from "@/components/layout";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconAdd } from "@/assets/icons/IconAdd";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { PlusIcon } from "@/assets/icons/plus";
import {
	getUserContext,
	getDecisionsByCouple,
	createDecision,
	updateDecision,
	deleteDecision,
	recordVote,
	getVotesForDecision,
	getUserVoteForDecision,
} from "@/lib/database";
import type { UserContext, DecisionWithOptions } from "@/types/database";
import {
	MOCK_OPTION_LISTS,
	USERS,
	simulateApiDelay,
	submitPollVote,
	type Decision,
	type PollDecision,
	type VoteDecision,
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

const FixedFooter = styled.View<{
	colorMode: "light" | "dark";
}>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 16px;
	border-top-width: 1px;
	border-top-color: ${({ colorMode }) => getColor("border", colorMode)};
	align-items: center;
`;

const ContentContainer = styled.View`
	flex: 1;
	padding-bottom: 80px;
`;

const OptionsList = styled.View`
	gap: 8px;
	margin-bottom: 16px;
`;

const OptionRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

const OptionInput = styled.View`
	flex: 1;
`;

const OptionListSelector = styled.View<{
	colorMode: "light" | "dark";
}>`
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const OptionListSelectorItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	padding: 12px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const OptionListSelectorItemText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const ButtonContainer = styled.View`
	flex-direction: row;
	gap: 12px;
	margin-top: 16px;
`;

// UI-specific decision type that extends the database type
type UIDecision = Omit<DecisionWithOptions, "options"> & {
	expanded: boolean;
	createdBy: string;
	details: string;
	decidedBy?: string;
	decidedAt?: string;
	options: Array<{
		id: string;
		title: string;
		selected: boolean;
	}>;
};

export default function Home() {
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer, updateContent } = useDrawer();
	const [decisions, setDecisions] = useState<UIDecision[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [voting, setVoting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [userContext, setUserContext] = useState<UserContext | null>(null);
	const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		dueDate: "",
		decisionType: "vote" as "poll" | "vote",
		selectedOptionListId: "" as string,
		selectedOptions: [] as DecisionOption[],
	});

	const renderCreateDecisionContent = () => {
		return (
			<>
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
					<FieldLabel colorMode={colorMode}>Due date</FieldLabel>
					<DatePickerComponent
						value={formData.dueDate}
						onChange={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
						placeholder="Select decision deadline"
					/>
				</FormFieldContainer>

				<ToggleContainer>
					<ToggleButton
						colorMode={colorMode}
						active={formData.decisionType === "poll"}
						onPress={() => setFormData((prev) => ({ ...prev, decisionType: "poll" }))}
					>
						<ToggleButtonText colorMode={colorMode} active={formData.decisionType === "poll"}>
							Poll
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
					<FieldLabel colorMode={colorMode}>Options</FieldLabel>
					<OptionsList>
						{formData.selectedOptions.map((option, index) => (
							<OptionRow key={option.id}>
								<OptionInput>
									<Input
										placeholder="Enter option"
										value={option.title}
										onChangeText={(text) => {
											setFormData((prev) => ({
												...prev,
												selectedOptions: prev.selectedOptions.map((opt, i) =>
													i === index ? { ...opt, title: text } : opt,
												),
											}));
										}}
									/>
								</OptionInput>
								<CircleButton
									colorMode={colorMode}
									onPress={() => {
										setFormData((prev) => ({
											...prev,
											selectedOptions: prev.selectedOptions.filter((_, i) => i !== index),
										}));
									}}
								>
									<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
								</CircleButton>
							</OptionRow>
						))}
					</OptionsList>
					<PrimaryButton
						colorMode={colorMode}
						onPress={() => {
							setFormData((prev) => ({
								...prev,
								selectedOptions: [
									...prev.selectedOptions,
									{
										id: `temp-${Date.now()}`,
										title: "",
										selected: false,
									},
								],
							}));
						}}
					>
						<PlusIcon size={16} color={getColor("yellowForeground", colorMode)} />
						<Text
							style={{
								color: getColor("yellowForeground", colorMode),
								fontWeight: "500",
								fontSize: 16,
								marginLeft: 8,
							}}
						>
							Add Option
						</Text>
					</PrimaryButton>
				</FormFieldContainer>

				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Option Lists</FieldLabel>
					<OptionListSelector colorMode={colorMode}>
						<Pressable onPress={() => handleOptionListSelect("")}>
							<OptionListSelectorItem colorMode={colorMode}>
								<OptionListSelectorItemText colorMode={colorMode}>None</OptionListSelectorItemText>
							</OptionListSelectorItem>
						</Pressable>
						{MOCK_OPTION_LISTS.map((list) => (
							<Pressable key={list.id} onPress={() => handleOptionListSelect(list.id)}>
								<OptionListSelectorItem colorMode={colorMode}>
									<OptionListSelectorItemText colorMode={colorMode}>{list.title}</OptionListSelectorItemText>
								</OptionListSelectorItem>
							</Pressable>
						))}
					</OptionListSelector>
				</FormFieldContainer>

				<ButtonContainer>
					<Button variant="outline" onPress={handleCancelEdit}>
						Cancel
					</Button>
					<PrimaryButton
						colorMode={colorMode}
						onPress={handleCreateFromDrawer}
						disabled={creating || !formData.title.trim()}
						style={{
							opacity: creating || !formData.title.trim() ? 0.6 : 1,
						}}
					>
						<Text
							style={{
								color: getColor("yellowForeground", colorMode),
								fontWeight: "500",
								fontSize: 16,
							}}
						>
							{creating ? "Creating..." : editingDecisionId ? "Update Decision" : "Create Decision"}
						</Text>
					</PrimaryButton>
				</ButtonContainer>
			</>
		);
	};

	const showCreateDecisionDrawer = useCallback(() => {
		setEditingDecisionId(null); // Reset editing state for new decision
		setFormData({
			title: "",
			description: "",
			dueDate: "",
			decisionType: "vote",
			selectedOptionListId: "",
			selectedOptions: [],
		});
		showDrawer("Create Decision", renderCreateDecisionContent());
	}, [showDrawer, renderCreateDecisionContent]);

	const handleOptionListSelect = (listId: string) => {
		const selectedList = MOCK_OPTION_LISTS.find((list) => list.id === listId);
		setFormData((prev) => ({
			...prev,
			selectedOptionListId: listId,
			selectedOptions: selectedList
				? selectedList.options.map((opt) => ({ ...opt, selected: false }))
				: [],
		}));
	};

	const handleOptionToggle = (optionId: string) => {
		setFormData((prev) => {
			const newOptions = prev.selectedOptions.map((option) =>
				option.id === optionId ? { ...option, selected: !option.selected } : option,
			);
			return {
				...prev,
				selectedOptions: newOptions,
			};
		});
	};

	useEffect(() => {
		// Load user context and decisions from Supabase
		const loadData = async () => {
			console.log("🚀 Home: Starting to load data from Supabase");
			setLoading(true);
			setError(null);

			try {
				// Get user context first
				const context = await getUserContext();
				if (!context) {
					setError("Unable to load user context. Please sign in again.");
					setLoading(false);
					return;
				}

				setUserContext(context);
				console.log("✅ Home: User context loaded:", context);

				// Load decisions for the couple
				const decisionsResult = await getDecisionsByCouple(context.coupleId);
				console.log("🔍 Home: Decisions result:", decisionsResult);

				if (decisionsResult.error) {
					setError(decisionsResult.error);
				} else {
					// Transform database decisions to match UI expectations
					const transformedDecisions: UIDecision[] =
						decisionsResult.data?.map((decision) => ({
							...decision,
							// Add UI-specific fields that aren't in database
							expanded: false,
							createdBy: decision.creator_id === context.userId ? USERS.YOU : USERS.PARTNER,
							details: decision.description || "",
							decidedBy: decision.decided_by
								? decision.decided_by === context.userId
									? USERS.YOU
									: USERS.PARTNER
								: undefined,
							decidedAt: decision.decided_at || undefined,
							options: decision.options.map((option) => ({
								id: option.id,
								title: option.title,
								selected: false,
							})),
						})) || [];
					console.log("✅ Home: Transformed decisions:", transformedDecisions);
					setDecisions(transformedDecisions);
				}
			} catch (err) {
				console.error("❌ Home: Error loading data:", err);
				setError(err instanceof Error ? err.message : "Failed to load decisions");
			} finally {
				setLoading(false);
			}
		};

		loadData();
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

	const handleDecide = async (decisionId: string, optionId: string) => {
		if (!userContext) return;

		setVoting(decisionId);
		setError(null);

		try {
			console.log("🚀 Home: Recording vote for decision:", decisionId, "option:", optionId);

			// Record the vote in Supabase
			const voteResult = await recordVote(decisionId, optionId, userContext.userId, 1);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			console.log("✅ Home: Vote recorded successfully");

			// Check if this is a poll or vote decision
			const decision = decisions.find((d) => d.id === decisionId);
			if (!decision) return;

			if (decision.type === "poll") {
				// For polls, just mark as voted
				const result = await updateDecision(decisionId, {
					status: "voted",
				});

				if (result.error) {
					setError(result.error);
					return;
				}

				// Update local state for poll
				setDecisions((prev) =>
					prev.map((decision) => {
						if (decision.id === decisionId) {
							return {
								...decision,
								status: "voted" as const,
							};
						}
						return decision;
					}),
				);
			} else {
				// For votes, check if both partners have voted
				const votesResult = await getVotesForDecision(decisionId, 1);
				if (votesResult.error) {
					setError(votesResult.error);
					return;
				}

				const votes = votesResult.data || [];
				const userVotes = votes.filter(
					(v) => v.user_id === userContext.userId || v.user_id === userContext.partnerId,
				);

				if (userVotes.length >= 2) {
					// Both partners have voted, mark as completed
					const result = await updateDecision(decisionId, {
						status: "completed",
						decided_by: userContext.userId,
						decided_at: new Date().toISOString(),
						final_decision: optionId,
					});

					if (result.error) {
						setError(result.error);
						return;
					}

					setDecisions((prev) =>
						prev.map((decision) => {
							if (decision.id === decisionId) {
								return {
									...decision,
									status: "completed" as const,
									decidedBy: USERS.YOU,
									decidedAt: new Date().toISOString(),
								};
							}
							return decision;
						}),
					);
				} else {
					// Only one partner has voted, mark as voted
					const result = await updateDecision(decisionId, {
						status: "voted",
					});

					if (result.error) {
						setError(result.error);
						return;
					}

					setDecisions((prev) =>
						prev.map((decision) => {
							if (decision.id === decisionId) {
								return {
									...decision,
									status: "voted" as const,
								};
							}
							return decision;
						}),
					);
				}
			}
		} catch (err) {
			setError("Failed to submit vote. Please try again.");
			console.error("Error voting:", err);
		} finally {
			setVoting(null);
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

	const handlePollOptionSelect = async (decisionId: string, optionId: string) => {
		if (!userContext) return;

		setVoting(decisionId);
		setError(null);

		try {
			console.log("🚀 Home: Recording poll vote for decision:", decisionId, "option:", optionId);

			// Record the poll vote in Supabase
			const voteResult = await recordVote(decisionId, optionId, userContext.userId, 1);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			console.log("✅ Home: Poll vote recorded successfully");

			// Update decision status to voted
			const result = await updateDecision(decisionId, {
				status: "voted",
			});

			if (result.error) {
				setError(result.error);
				return;
			}

			// Update local state
			setDecisions((prev) =>
				prev.map((decision) => {
					if (decision.id === decisionId) {
						return {
							...decision,
							status: "voted" as const,
							options: decision.options.map((option) =>
								option.id === optionId ? { ...option, selected: true } : { ...option, selected: false },
							),
						};
					}
					return decision;
				}),
			);
		} catch (err) {
			setError("Failed to submit poll vote. Please try again.");
			console.error("Error voting in poll:", err);
		} finally {
			setVoting(null);
		}
	};

	const handleDelete = async (decisionId: string) => {
		try {
			console.log("🚀 Home: Deleting decision:", decisionId);

			const result = await deleteDecision(decisionId);

			if (result.error) {
				setError(result.error);
				return;
			}

			console.log("✅ Home: Decision deleted successfully");

			setDecisions((prev) => prev.filter((decision) => decision.id !== decisionId));
		} catch (err) {
			setError("Failed to delete decision. Please try again.");
			console.error("Error deleting decision:", err);
		}
	};

	const handleEditDecision = (decisionId: string) => {
		// For now, this is handled entirely within the CollapsibleCard component
		// The inline editing state is managed there
		// In the future, we might need to save changes to the database here
		console.log("Edit decision:", decisionId);
	};

	const handleCancelEdit = () => {
		hideDrawer();
		setEditingDecisionId(null);
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

	const handleUpdateOptions = (decisionId: string, newOptions: DecisionOption[]) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId ? { ...decision, options: newOptions } : decision,
			),
		);
	};

	const handleCreateFromDrawer = async () => {
		if (!formData.title.trim() || !userContext) return;

		setCreating(true);
		setError(null);

		try {
			// Get selected options from the form
			const selectedOptions = formData.selectedOptions.filter((opt) => opt.selected);
			const options =
				selectedOptions.length > 0
					? selectedOptions.map((opt) => ({
							title: opt.title,
							votes: 0,
							eliminated_in_round: null,
						}))
					: [];

			if (editingDecisionId) {
				// Update existing decision
				const decisionData = {
					title: formData.title,
					description: formData.description || null,
					deadline: formData.dueDate || null,
					type: formData.decisionType,
				};

				console.log("🚀 Home: Updating decision:", editingDecisionId, "with data:", decisionData);

				const result = await updateDecision(editingDecisionId, decisionData);

				if (result.error) {
					setError(result.error);
					return;
				}

				console.log("✅ Home: Decision updated successfully:", result.data);

				// Update local state
				setDecisions((prev) =>
					prev.map((decision) => {
						if (decision.id === editingDecisionId) {
							return {
								...decision,
								title: result.data!.title,
								description: result.data!.description,
								deadline: result.data!.deadline,
								type: result.data!.type,
								details: result.data!.description || "",
							};
						}
						return decision;
					}),
				);
			} else {
				// Create new decision
				const decisionData = {
					title: formData.title,
					description: formData.description || null,
					deadline: formData.dueDate || null,
					creator_id: userContext.userId,
					partner_id: userContext.partnerId,
					couple_id: userContext.coupleId,
					type: formData.decisionType,
					status: "pending" as const,
				};

				console.log("🚀 Home: Creating decision with data:", decisionData, "options:", options);

				const result = await createDecision(
					decisionData,
					options.map((option) => ({
						...option,
						decision_id: "", // This will be set by the createDecision function
					})),
				);

				if (result.error) {
					setError(result.error);
					return;
				}

				console.log("✅ Home: Decision created successfully:", result.data);

				// Transform the new decision to match UI expectations
				const newUIDecision: UIDecision = {
					...result.data!,
					expanded: false,
					createdBy: USERS.YOU,
					details: result.data!.description || "",
					decidedBy: undefined,
					decidedAt: undefined,
					options: result.data!.options.map((option) => ({
						id: option.id,
						title: option.title,
						selected: false,
					})),
				};

				setDecisions((prev) => [newUIDecision, ...prev]);
			}

			hideDrawer();

			// Reset form and editing state
			setFormData({
				title: "",
				description: "",
				dueDate: "",
				decisionType: "vote",
				selectedOptionListId: "",
				selectedOptions: [],
			});
			setEditingDecisionId(null);
		} catch (err) {
			setError(
				editingDecisionId
					? "Failed to update decision. Please try again."
					: "Failed to create decision. Please try again.",
			);
			console.error("Error:", err);
		} finally {
			setCreating(false);
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
							// For now, we'll handle this as a simple vote decision
							// Poll functionality will be implemented in a later commit
							const currentRoundVotes = {};

							return (
								<CollapsibleCard
									key={decision.id}
									title={decision.title}
									createdBy={decision.createdBy}
									deadline={decision.deadline || ""}
									details={decision.details || ""}
									options={decision.options}
									expanded={decision.expanded}
									status={decision.status}
									decidedBy={decision.decidedBy}
									decidedAt={decision.decidedAt || undefined}
									loading={voting === decision.id}
									mode={(decision as any).mode || "vote"}
									currentRound={(decision as any).currentRound || 1}
									pollVotes={currentRoundVotes}
									onToggle={() => handleToggleDecision(decision.id)}
									onDecide={(optionId: string) => handleDecide(decision.id, optionId)}
									onDelete={() => handleDelete(decision.id)}
									onOptionSelect={(optionId: string) => handleOptionSelect(decision.id, optionId)}
									onUpdateOptions={(newOptions) => handleUpdateOptions(decision.id, newOptions)}
									onPollVote={(optionId: string) => handlePollOptionSelect(decision.id, optionId)}
									onEditDecision={() => handleEditDecision(decision.id)}
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
