import React, { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "@/components/SafeAreaView";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { OptionCard } from "@/components/layout/OptionCard";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import MainLayout from "@/components/layout/MainLayout";

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
	}, []);

	const handleListPress = (list: List) => {
		console.log("Pressed list:", list.title);
	};

	const handleCreateOption = () => {
		hideDrawer();
		console.log("Creating new option...");
	};

	const handleShowCreateDrawer = () => {
		showDrawer("Create a New Option", renderCreateContent());
	};

	const renderCreateContent = () => (
		<>
			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Title</FieldLabel>
				<Input placeholder="Enter option title" />
			</FormFieldContainer>

			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Description</FieldLabel>
				<Textarea
					placeholder="Enter option description"
					style={{
						minHeight: 96,
					}}
				/>
			</FormFieldContainer>

			<FormFieldContainer>
				<Button variant="default" onPress={handleCreateOption}>
					Create Option
				</Button>
			</FormFieldContainer>

			<Button variant="outline" onPress={hideDrawer}>
				Cancel
			</Button>
		</>
	);

	return (
		<MainLayout createButtonText="Create Option" onCreatePress={handleShowCreateDrawer}>
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
		</MainLayout>
	);
}
