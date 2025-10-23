import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { Button, CircleButton, PrimaryButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import { CollapsibleListCard } from "@/components/ui/CollapsibleListCard";
import { EditableOptionsList, EditableOption } from "@/components/ui/EditableOptionsList";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import ContentLayout from "@/components/layout/ContentLayout";
import { IconAdd } from "@/assets/icons/IconAdd";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { useUserContext } from "@/context/user-context-provider";
import { useOptionLists } from "@/context/option-lists-provider";
import type { OptionListWithItems } from "@/types/database";

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

const CustomCircleButton = styled(CircleButton)<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("tertiary", colorMode)};
`;

const ListsContainer = styled.View`
	gap: 16px;
`;

const FormFieldContainer = styled.View`
	margin-bottom: 16px;
`;

const FieldLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-weight: 500;
	margin-bottom: 8px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
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

const ErrorContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("destructive", colorMode)};
	padding: 12px;
	border-radius: 8px;
	margin-bottom: 16px;
`;

const ErrorText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	color: ${({ colorMode }) => getColor("background", colorMode)};
	text-align: center;
`;

// Extended type to match UI expectations
interface OptionListUI extends OptionListWithItems {
	expanded: boolean;
}

export default function Options() {
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer, updateContent } = useDrawer();

	// Get data from providers
	const { userContext, loading: userLoading, error: userError } = useUserContext();
	const {
		optionLists,
		loading: listsLoading,
		error: listsError,
		createList,
		updateList,
		deleteList,
	} = useOptionLists();

	// Local UI state for expanded cards
	const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());
	const [allCollapsed, setAllCollapsed] = useState(false);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
	});
	const [formOptions, setFormOptions] = useState<EditableOption[]>([]);

	const handleToggleAll = () => {
		const newCollapsedState = !allCollapsed;
		setAllCollapsed(newCollapsedState);
		if (newCollapsedState) {
			// Collapse all
			setExpandedListIds(new Set());
		} else {
			// Expand all
			setExpandedListIds(new Set(optionLists.map((list) => list.id)));
		}
	};

	const handleToggleList = (listId: string) => {
		setExpandedListIds((prev) => {
			const next = new Set(prev);
			if (next.has(listId)) {
				next.delete(listId);
			} else {
				next.add(listId);
			}
			return next;
		});
	};

	const handleDeleteList = async (listId: string) => {
		await deleteList(listId);
	};

	const handleUpdateListOptions = async (listId: string, newOptions: EditableOption[]) => {
		// Find the list to preserve title and description
		const list = optionLists.find((l) => l.id === listId);
		if (!list) return;

		await updateList(
			listId,
			{
				title: list.title,
				description: list.description || "",
			},
			newOptions,
		);
	};

	const handleCreateFromDrawer = useCallback(async () => {
		if (!formData.title.trim() || !userContext?.coupleId) return;

		const result = await createList(
			{
				couple_id: userContext.coupleId,
				title: formData.title,
				description: formData.description || "",
			},
			formOptions,
		);

		if (result) {
			hideDrawer();
			// Reset form
			setFormData({ title: "", description: "" });
			setFormOptions([]);
		}
	}, [formData, userContext, formOptions, createList, hideDrawer]);

	const renderCreateListContent = useCallback(
		() => (
			<>
				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Title</FieldLabel>
					<Input
						placeholder="Enter list title"
						value={formData.title}
						onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
					/>
				</FormFieldContainer>

				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Description</FieldLabel>
					<Textarea
						placeholder="Enter list description"
						value={formData.description}
						onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
						style={{ minHeight: 80 }}
					/>
				</FormFieldContainer>

				<FormFieldContainer>
					<EditableOptionsList
						options={formOptions}
						onOptionsUpdate={setFormOptions}
						title="Options"
						emptyMessage="No options added yet. Tap the edit button to add some!"
					/>
				</FormFieldContainer>

				<FormFieldContainer>
					<Button variant="default" onPress={handleCreateFromDrawer} disabled={!formData.title.trim()}>
						Create List
					</Button>
				</FormFieldContainer>

				<Button variant="outline" onPress={hideDrawer}>
					Cancel
				</Button>
			</>
		),
		[colorMode, formData, formOptions, handleCreateFromDrawer, hideDrawer],
	);

	const showCreateListDrawer = useCallback(() => {
		setFormData({ title: "", description: "" });
		setFormOptions([]);
		showDrawer("Create New List", renderCreateListContent());
	}, [showDrawer, renderCreateListContent]);

	// Update drawer content when form data changes
	useEffect(() => {
		updateContent(renderCreateListContent());
	}, [formData, formOptions, updateContent, renderCreateListContent]);

	// Transform option lists to include expanded UI state
	const lists: OptionListUI[] = optionLists.map((list) => ({
		...list,
		expanded: expandedListIds.has(list.id),
	}));

	// Combine loading and error states from both providers
	const loading = userLoading || listsLoading;
	const error = userError || listsError;

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 }}>
					<Text style={{ color: getColor("mutedForeground", colorMode) }}>Loading option lists...</Text>
				</View>
			</ContentLayout>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<ContentContainer>
				<ContentLayout scrollable={true}>
					{error && (
						<ErrorContainer colorMode={colorMode}>
							<ErrorText colorMode={colorMode}>{error}</ErrorText>
						</ErrorContainer>
					)}

					<TitleContainer>
						<TitleText colorMode={colorMode}>Lists of Options</TitleText>
						<CustomCircleButton colorMode={colorMode} onPress={handleToggleAll}>
							{allCollapsed ? (
								<IconUnfoldMore size={20} color="white" />
							) : (
								<IconUnfoldLess size={20} color="white" />
							)}
						</CustomCircleButton>
					</TitleContainer>

					<ListsContainer>
						{lists.map((list) => (
							<CollapsibleListCard
								key={list.id}
								list={{
									id: list.id,
									title: list.title,
									description: list.description || "",
									options: list.items,
									expanded: list.expanded,
								}}
								onToggle={() => handleToggleList(list.id)}
								onDelete={() => handleDeleteList(list.id)}
								onOptionsUpdate={(newOptions) => handleUpdateListOptions(list.id, newOptions)}
							/>
						))}
					</ListsContainer>
				</ContentLayout>
			</ContentContainer>

			<FixedFooter colorMode={colorMode}>
				<PrimaryButton colorMode={colorMode} onPress={showCreateListDrawer}>
					<IconAdd size={16} color={getColor("yellowForeground", colorMode)} />
					<Text
						style={{
							color: getColor("yellowForeground", colorMode),
							fontWeight: "500",
							fontSize: 16,
							marginLeft: 8,
						}}
					>
						Create List
					</Text>
				</PrimaryButton>
			</FixedFooter>
		</View>
	);
}
