import { LegalPage } from "@/components/legal/legal-page";
import { PRIVACY_POLICY } from "@/lib/legal";

/** Public: linked from Settings and from App Store Connect (`PRIVACY_URL`). */
export default function Privacy() {
	return <LegalPage document={PRIVACY_POLICY} />;
}
