import * as React from "react";
import { Pressable, View } from "react-native";
import * as Linking from "expo-linking";

import { ContentLayout } from "@/components/layout";
import { Body, Caption, Display, Title } from "@/components/ui/reusables/headline/headline";
import { HeartMark } from "@/components/ui/reusables/heart-mark/heart-mark";
import { Text } from "@/components/ui/reusables/text";
import type { LegalDocument, LegalSection } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * A long-form reading page: the privacy policy and the support page.
 *
 * Same frame as `AuthScreen` (heart on the title's left edge, 450 px cap so a
 * desktop browser doesn't stretch the line length), but scrollable and with no
 * pinned footer — these pages are read top to bottom, and both are public
 * routes App Store Connect links to on the web.
 *
 * The title follows the auth screens' one-bold-word rule: "Privacy
 * **Policy**", "**Support**".
 */

function splitLast(title: string): [lead: string, strong: string] {
	const i = title.lastIndexOf(" ");
	return i === -1 ? ["", title] : [title.slice(0, i + 1), title.slice(i + 1)];
}

function Section({ section }: { section: LegalSection }) {
	return (
		<View className="gap-2">
			<Title role="heading" aria-level={2}>
				{section.heading}
			</Title>
			{section.paragraphs?.map((p) => (
				<Body key={p} className="text-ink-2">
					{p}
				</Body>
			))}
			{section.bullets ? (
				<View className="gap-2" role="list">
					{section.bullets.map((b) => (
						<View key={b} className="flex-row gap-2" role="listitem">
							<Body className="text-ink-2">•</Body>
							<Body className="flex-1 text-ink-2">{b}</Body>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}

function LegalPage({ document }: { document: LegalDocument }) {
	const person = usePersonColors();
	const [lead, strong] = splitLast(document.title);

	return (
		<ContentLayout scrollable>
			<View className="w-full max-w-[450px] gap-6 self-center pb-10">
				<View className="items-start">
					<HeartMark color={person.a.base} size={40} />
				</View>
				<View className="gap-1">
					<Display>
						{lead}
						<Display.Strong>{strong}</Display.Strong>
					</Display>
					<Caption>{document.updated}</Caption>
				</View>
				<Body>{document.intro}</Body>
				{document.sections.map((section) => (
					<Section key={section.heading} section={section} />
				))}
				<Pressable
					role="link"
					accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
					onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
				>
					<Text className="text-row font-semibold text-ink underline">{SUPPORT_EMAIL}</Text>
				</Pressable>
			</View>
		</ContentLayout>
	);
}

export { LegalPage, splitLast };
