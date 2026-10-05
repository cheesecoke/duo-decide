import { LegalPage } from "@/components/legal/legal-page";
import { SUPPORT_PAGE } from "@/lib/legal";

/** Public: linked from Settings and from App Store Connect (`SUPPORT_URL`). */
export default function Support() {
	return <LegalPage document={SUPPORT_PAGE} />;
}
