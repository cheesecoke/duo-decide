import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { OptionCard } from "@/components/layout/OptionCard";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { useFloatingNav } from "@/context/floating-nav-provider";
import ContentLayout from "@/components/layout/ContentLayout";

const SectionContainer = styled.View`
	margin-bottom: 24px;
`;

const SectionTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	margin-bottom: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
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

const LoadingContainer = styled.View`
	align-items: center;
	padding: 32px 0;
`;

const LoadingText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const ListContainer = styled.View`
	gap: 16px;
`;

interface List {
	id: string;
	title: string;
	description: string;
	created_at: string;
	updated_at: string;
}

export default function Home() {
	const [lists, setLists] = useState<List[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const { colorMode } = useTheme();
	const { showDrawer, hideDrawer } = useDrawer();
	const { updateConfig } = useFloatingNav();

	const handleCreateOption = useCallback(() => {
		hideDrawer();
		console.log("Creating new option...");
	}, [hideDrawer]);

	const renderCreateContent = useCallback(() => (
		<>
			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Title</FieldLabel>
				<Input placeholder="Enter list title" />
			</FormFieldContainer>
			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Description</FieldLabel>
				<Textarea placeholder="Enter list description" />
			</FormFieldContainer>
			<Button size="default" variant="default" onPress={handleCreateOption}>
				Create
			</Button>
			<Button size="default" variant="outline" onPress={hideDrawer}>
				Cancel
			</Button>
		</>
	), [colorMode, hideDrawer, handleCreateOption]);

	const handleShowCreateDrawer = useCallback(() => {
		showDrawer("Create a New Option", renderCreateContent());
	}, [showDrawer, renderCreateContent]);

	useEffect(() => {
		// Configure floating nav for this page on mount
		updateConfig({
			show: true,
			createButtonText: "Create Option",
			onCreatePress: handleShowCreateDrawer
		});

		// Cleanup on unmount
		return () => {
			updateConfig({ show: false });
		};
	}, [updateConfig, handleShowCreateDrawer]);

	useEffect(() => {

		const fetchLists = async () => {
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const mockData: List[] = [
				{
					id: "1",
					title: "Dinner Ideas",
					description: "Fun dinner ideas for LA",
					created_at: "2024-01-15T10:00:00Z",
					updated_at: "2024-01-15T10:00:00Z",
				},
				{
					id: "2",
					title: "Date Nights",
					description: "Two night ideas",
					created_at: "2024-01-14T15:30:00Z",
					updated_at: "2024-01-14T15:30:00Z",
				},
				{
					id: "3",
					title: "Spur of the moment",
					description: "Random ideas",
					created_at: "2024-01-13T09:15:00Z",
					updated_at: "2024-01-13T09:15:00Z",
				},
			];

			setLists(mockData);
			setLoading(false);
		};

		fetchLists();
	}, [updateConfig, handleShowCreateDrawer]);

	const handleListPress = (list: List) => {
		console.log("Pressed list:", list.title);
	};



	return (
		<ContentLayout scrollable={true}>
			<SectionContainer>
				<SectionTitle colorMode={colorMode}>Lists of Options</SectionTitle>

				{loading ? (
					<LoadingContainer>
						<LoadingText colorMode={colorMode}>Loading lists...</LoadingText>
					</LoadingContainer>
				) : (
					<ListContainer>
						{lists.map((list) => (
							<OptionCard
								key={list.id}
								title={list.title}
								description={list.description}
								onPress={() => handleListPress(list)}
							/>
						))}
					</ListContainer>
				)}
			</SectionContainer>
		</ContentLayout>
	);
}
