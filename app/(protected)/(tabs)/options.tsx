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
import { MOCK_OPTION_LISTS, simulateApiDelay, type OptionList } from "@/data/mockData";

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

export default function Options() {
	const [lists, setLists] = useState<OptionList[]>([]);
	const [loading, setLoading] = useState(true);
	const [allCollapsed, setAllCollapsed] = useState(false);
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer } = useDrawer();

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

	const handleDeleteList = (listId: string) => {
		setLists((prevLists) => prevLists.filter((list) => list.id !== listId));
	};

	const handleUpdateListOptions = (listId: string, newOptions: EditableOption[]) => {
		// Convert EditableOption[] to DecisionOption[] by adding selected: false
		const convertedOptions = newOptions.map((option) => ({ ...option, selected: false }));
		setLists((prevLists) =>
			prevLists.map((list) => (list.id === listId ? { ...list, options: convertedOptions } : list)),
		);
	};

	const handleCreateFromDrawer = () => {
		if (!formData.title.trim()) return;

		// Convert EditableOption[] to DecisionOption[] by adding selected: false
		const convertedOptions = formOptions.map((option) => ({ ...option, selected: false }));

		const newList: OptionList = {
			id: Date.now().toString(),
			title: formData.title,
			description: formData.description,
			options: convertedOptions,
			expanded: false,
			createdAt: new Date().toISOString(),
		};

		setLists((prev) => [newList, ...prev]);
		hideDrawer();

		// Reset form
		setFormData({ title: "", description: "" });
		setFormOptions([]);
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
		const loadLists = async () => {
			setLoading(true);
			await simulateApiDelay(1000);

			setLists(MOCK_OPTION_LISTS);
			setLoading(false);
		};

		loadLists();
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
								list={list}
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
