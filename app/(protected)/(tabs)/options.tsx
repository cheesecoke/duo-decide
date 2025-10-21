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
import {
	getOptionListsByCouple,
	createOptionList,
	updateOptionList,
	deleteOptionList,
	getUserContext,
} from "@/lib/database";
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
	const [lists, setLists] = useState<OptionListUI[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer } = useDrawer();
	const [coupleId, setCoupleId] = useState<string | null>(null);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
	});
	const [formOptions, setFormOptions] = useState<EditableOption[]>([]);

	const handleToggleAll = () => {
		setAllCollapsed(!allCollapsed);
		setLists((prevLists) =>
			prevLists.map((list) => ({
				...list,
				expanded: allCollapsed, // If all were collapsed, expand all
			})),
		);
	};

	const handleToggleList = (listId: string) => {
		setLists((prevLists) =>
			prevLists.map((list) => (list.id === listId ? { ...list, expanded: !list.expanded } : list)),
		);
	};

	const handleDeleteList = async (listId: string) => {
		try {
			const result = await deleteOptionList(listId);
			if (result.error) {
				setError(result.error);
			} else {
				// Remove from local state on success
				setLists((prevLists) => prevLists.filter((list) => list.id !== listId));
			}
		} catch (err) {
			setError("Failed to delete list. Please try again.");
			console.error("Error deleting list:", err);
		}
	};

	const handleUpdateListOptions = async (listId: string, newOptions: EditableOption[]) => {
		try {
			// Find the list to preserve title and description
			const list = lists.find((l) => l.id === listId);
			if (!list) return;

			const result = await updateOptionList(
				listId,
				{
					title: list.title,
					description: list.description || "",
				},
				newOptions,
			);

			if (result.error) {
				setError(result.error);
			} else if (result.data) {
				// Update local state with new data
				setLists((prevLists) =>
					prevLists.map((l) =>
						l.id === listId
							? {
									...result.data!,
									expanded: l.expanded,
							  }
							: l,
					),
				);
			}
		} catch (err) {
			setError("Failed to update list. Please try again.");
			console.error("Error updating list:", err);
		}
	};

	const handleCreateFromDrawer = async () => {
		if (!formData.title.trim() || !coupleId) return;

		try {
			const result = await createOptionList(
				{
					couple_id: coupleId,
					title: formData.title,
					description: formData.description || "",
				},
				formOptions,
			);

			if (result.error) {
				setError(result.error);
			} else if (result.data) {
				// Add to local state
				setLists((prev) => [{ ...result.data!, expanded: false }, ...prev]);
				hideDrawer();

				// Reset form
				setFormData({ title: "", description: "" });
				setFormOptions([]);
			}
		} catch (err) {
			setError("Failed to create list. Please try again.");
			console.error("Error creating list:", err);
		}
	};

	const showCreateListDrawer = useCallback(() => {
		setFormData({ title: "", description: "" });
		setFormOptions([]);
		showDrawer("Create New List", renderCreateListContent());
	}, [showDrawer]);

	const renderCreateListContent = () => (
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
	);

	useEffect(() => {
		const loadUserAndLists = async () => {
			setLoading(true);
			setError(null);

			try {
				// Get user context to get couple_id
				const userContext = await getUserContext();
				if (!userContext || !userContext.coupleId) {
					setError("Unable to load user data. Please try again.");
					setLoading(false);
					return;
				}

				setCoupleId(userContext.coupleId);

				// Load option lists for this couple
				const result = await getOptionListsByCouple(userContext.coupleId);
				if (result.error) {
					setError(result.error);
				} else {
					// Transform data to include expanded property
					const listsWithExpanded = (result.data || []).map((list) => ({
						...list,
						expanded: false,
					}));
					setLists(listsWithExpanded);
				}
			} catch (err) {
				setError("Failed to load option lists. Please try again.");
				console.error("Error loading lists:", err);
			} finally {
				setLoading(false);
			}
		};

		loadUserAndLists();
	}, []);

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
