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
import { useDecisionsData, type UIDecision } from "./decision-queue/hooks/useDecisionsData";
import {
	createDecision,
	updateDecision,
	deleteDecision,
	recordVote,
	getVotesForDecision,
	checkRoundCompletion,
	progressToNextRound,
	completeDecision,
	getVoteCountsForDecision,
	getDecisionById,
} from "@/lib/database";

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

	// Use custom hook for data loading and subscriptions
	const { decisions, setDecisions, userContext, pollVotes, setPollVotes, loading, error, setError } =
		useDecisionsData();

	// Local UI state
	const [creating, setCreating] = useState(false);
	const [voting, setVoting] = useState<string | null>(null);
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
			onSubmit={handleCreateFromDrawer}
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

			// Record the vote in Supabase (it will update if vote already exists)
			const voteResult = await recordVote(decisionId, optionId, userContext.userId, 1);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			console.log("✅ Home: Vote recorded successfully");

			// Update local state to show selected option
			setDecisions((prev) =>
				prev.map((decision) => {
					if (decision.id === decisionId) {
						return {
							...decision,
							options: decision.options.map((option) =>
								option.id === optionId ? { ...option, selected: true } : { ...option, selected: false },
							),
						};
					}
					return decision;
				}),
			);

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
									decidedBy: userContext.userName,
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

	const handlePollOptionSelect = (decisionId: string, optionId: string) => {
		// Just update local selection state - don't submit vote yet
		setDecisions((prev) =>
			prev.map((decision) => {
				if (decision.id === decisionId) {
					return {
						...decision,
						options: decision.options.map((option) =>
							option.id === optionId ? { ...option, selected: true } : { ...option, selected: false },
						),
					};
				}
				return decision;
			}),
		);
	};

	const handlePollVoteSubmit = async (decisionId: string) => {
		if (!userContext) return;

		// Find the selected option
		const decision = decisions.find((d) => d.id === decisionId);
		if (!decision) return;

		const selectedOption = decision.options.find((opt) => opt.selected);
		if (!selectedOption) {
			setError("Please select an option first");
			return;
		}

		// Validate current_round exists
		if (!decision.current_round) {
			console.error("❌ Decision missing current_round:", decision);
			setError("Decision data is invalid - missing current round");
			return;
		}

		setVoting(decisionId);
		setError(null);

		try {
			console.log(
				"🚀 Home: Recording poll vote for decision:",
				decisionId,
				"option:",
				selectedOption.id,
				"round:",
				decision.current_round,
			);

			// Record the poll vote in Supabase (it will update if vote already exists)
			const voteResult = await recordVote(
				decisionId,
				selectedOption.id,
				userContext.userId,
				decision.current_round,
			);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			console.log("✅ Home: Poll vote recorded successfully");

			// Check if both partners have voted for this round
			const roundCompleteResult = await checkRoundCompletion(
				decisionId,
				decision.current_round,
				userContext.coupleId,
			);

			if (roundCompleteResult.error) {
				console.error("❌ Error checking round completion:", roundCompleteResult.error);
				setError("Failed to check round completion");
				return;
			}

			if (roundCompleteResult.data) {
				console.log(
					"🎉 Both partners have voted! Checking for decision completion or round progression...",
				);

				// Get vote counts to check if both partners voted for the same option
				const voteCountsResult = await getVoteCountsForDecision(decisionId, decision.current_round);

				if (voteCountsResult.error) {
					console.error("❌ Error getting vote counts:", voteCountsResult.error);
					setError("Failed to get vote counts");
					return;
				}

				const voteCounts = voteCountsResult.data || {};
				const votedOptions = Object.keys(voteCounts).filter((optionId) => voteCounts[optionId] > 0);

				// Round 3 is the FINAL round - always complete the decision
				// In Round 3, only the partner votes, so there will be 1 vote total
				const isRound3 = decision.current_round === 3;

				// Check if both partners voted for the same option OR if we're in Round 3 (decision complete)
				if (votedOptions.length === 1 || isRound3) {
					if (isRound3) {
						console.log("🎯 Round 3 complete! Partner selected the final option. Decision complete.");
					} else {
						console.log("🎯 Both partners voted for the same option! Decision complete.");
					}

					const finalOptionId = votedOptions[0];
					const completeResult = await completeDecision(decisionId, finalOptionId, userContext.userId);

					if (completeResult.error) {
						console.error("❌ Error completing decision:", completeResult.error);
						setError("Failed to complete decision");
						return;
					}

					// Update local state to completed
					setDecisions((prev) =>
						prev.map((d) => {
							if (d.id === decisionId) {
								return {
									...d,
									status: "completed" as const,
									final_decision: finalOptionId,
									decided_by: userContext.userId,
								};
							}
							return d;
						}),
					);

					// Clear poll votes for completed decision
					setPollVotes((prev) => {
						const newVotes = { ...prev };
						delete newVotes[decisionId];
						return newVotes;
					});

					console.log("✅ Decision completed successfully!");
				} else {
					// Different options voted - progress to next round
					console.log("🔄 Partners voted for different options. Progressing to next round...");

					const progressResult = await progressToNextRound(decisionId, decision.current_round);

					if (progressResult.error) {
						console.error("❌ Error progressing to next round:", progressResult.error);
						setError("Failed to progress to next round");
						return;
					}

					// Reload the decision to get updated options and round
					const updatedDecisionResult = await getDecisionById(decisionId);
					if (updatedDecisionResult.data) {
						// Transform database options to UI options
						const uiOptions = updatedDecisionResult.data.options.map((option) => ({
							id: option.id,
							title: option.title,
							selected: false, // Reset selection for new round
						}));

						setDecisions((prev) =>
							prev.map((d) => {
								if (d.id === decisionId) {
									return {
										...d,
										...updatedDecisionResult.data,
										options: uiOptions,
										status: "pending" as const, // Reset to pending for new round
									};
								}
								return d;
							}),
						);

						// Clear poll votes for new round (both users can vote again)
						setPollVotes((prev) => {
							const newVotes = { ...prev };
							delete newVotes[decisionId];
							return newVotes;
						});
					}

					console.log("✅ Progressed to next round successfully!");
				}
			} else {
				// Only one partner has voted - update status to "voted"
				console.log("⏳ Waiting for partner to vote...");

				const result = await updateDecision(decisionId, {
					status: "voted",
				});

				if (result.error) {
					setError(result.error);
					return;
				}

				// Update local state with voted status
				setDecisions((prev) =>
					prev.map((d) => {
						if (d.id === decisionId) {
							return {
								...d,
								status: "voted" as const,
							};
						}
						return d;
					}),
				);

				// Update poll votes state
				setPollVotes((prev) => ({
					...prev,
					[decisionId]: {
						...prev[decisionId],
						[userContext.userName]: selectedOption.id,
					},
				}));
			}
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
			customOptions: [],
		});
	};

	const handleUpdateOptions = (
		decisionId: string,
		newOptions: Array<{ id: string; title: string; selected: boolean }>,
	) => {
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
			// Combine selected options from Option List and custom options
			const selectedListOptions = formData.selectedOptions.filter((opt) => opt.selected);
			const allOptions = [...selectedListOptions, ...formData.customOptions];

			const options =
				allOptions.length > 0
					? allOptions.map((opt) => ({
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
					partner_id: userContext.partnerId || userContext.userId, // Fallback to creator if no partner yet
					couple_id: userContext.coupleId,
					type: formData.decisionType,
					status: "pending" as const,
					current_round: 1,
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
					createdBy: userContext.userName,
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
				customOptions: [],
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
											? () => handlePollVoteSubmit(decision.id)
											: (optionId: string) => handleDecide(decision.id, optionId)
									}
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
