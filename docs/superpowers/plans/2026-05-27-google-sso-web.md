# Google SSO (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" sign-in/sign-up on web using Supabase OAuth + PKCE. Native (iOS/Android) is a separate plan.

**Architecture:** Supabase's `signInWithOAuth({ provider: 'google' })` triggers a full-page redirect on web. Google → Supabase callback (`https://<ref>.supabase.co/auth/v1/callback`) → returns to our app with `?code=` in the URL. The existing client config already has `flowType: "pkce"` and `detectSessionInUrl: true` (`config/supabase.ts:98-99`), so the code is auto-exchanged into a session. The existing routing effect (`context/supabase-provider.tsx:192-250`) then routes the user into the app, picking up the partner-linking trigger automatically via `handle_new_user()` (migration 012). No database or routing changes required.

**Tech Stack:** Expo Router (web) · Supabase Auth (PKCE) · `@supabase/supabase-js` 2.49.4 · Emotion Native · Jest + @testing-library/react-native

**Scope:** Web only. Native flow (deep-link return path, `expo-web-browser` / `expo-auth-session`) is intentionally deferred to a follow-up plan. The Google button will be hidden on native (`Platform.OS !== "web"`) so this PR ships cleanly without half-implementing native.

**Known follow-ups (NOT in this plan):**
1. Native iOS/Android Google SSO (deep-link, browser session).
2. Display-name fallback — `handle_new_user()` trigger reads `raw_user_meta_data->>'display_name'`, which Google won't set. Google-invited partners auto-link and bypass `/setup-partner`, so they will have NULL `display_name`. Either map Google's `full_name`/`name` claim into `display_name` (trigger change — its own migration), or surface a "set your name" step post-link. Defer to a follow-up plan after we confirm the linking flow works end-to-end.

**Suggested PR split** (matches the "small reviewable chunks" preference — these are tightly coupled but separable):
- **PR A** — Tasks 1 + 2 (`getGoogleOAuthRedirectTo` helper + `signInWithGoogle` on AuthContext). Pure plumbing, no UI. Reviewable in <5 min.
- **PR B** — Tasks 3 + 4 + 5 + 6 (`AuthDivider`, `GoogleAuthButton`, sign-in/sign-up integration). The user-visible change. Depends on PR A.
- **PR C** — Tasks 7 + 8 (docs + manual smoke). Can ship with PR B or as a follow-up depending on when the external Google Cloud/Supabase setup is finished.

Or, if the user prefers, ship all 8 tasks as a single PR — the commits are already separated for atomic review.

---

## External prerequisites (user, in parallel)

These cannot be done in code. Run them in parallel with Task 1. The plan is testable without them only at the unit-test layer; manual smoke (Task 8) requires them.

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID → Web application.
   - Authorized JavaScript origins: every web origin you'll use — `http://localhost:8081` (and any other Expo dev port you've seen, e.g. `http://localhost:8082`), plus the production web origin (e.g. `https://duo-decide.vercel.app`).
   - Authorized redirect URIs: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard** → Authentication → Providers → Google → toggle ON, paste Client ID + Client Secret, save.
3. **Supabase Dashboard** → Authentication → URL Configuration → confirm Site URL and additional redirect URLs include every dev origin AND the production web origin.
4. **Supabase Dashboard** → Authentication → Settings → confirm the **identity linking** policy. On newer Supabase projects this defaults to "Manual linking only" — fine for v1, but verify so the smoke test in Task 8 step 7 has the expected behaviour.

> **Ongoing**: every time the production URL changes (rename, new Vercel domain, custom domain), BOTH Google Cloud authorized origins AND Supabase URL configuration must be updated — otherwise OAuth silently breaks in prod.

---

## File Structure

| Path | Action | Responsibility |
|------|--------|----------------|
| `config/oauth-redirect.ts` | Create | Pure helper returning the post-OAuth `redirectTo` URL for web. Mirrors `getEmailRedirectTo()` / `getPasswordResetRedirectTo()` in `config/supabase.ts`. |
| `__tests__/config/oauth-redirect.test.ts` | Create | Unit tests for the helper across Platform + globalThis.location states. |
| `context/supabase-provider.tsx` | Modify | Add `signInWithGoogle` to `AuthState` type + provider value. Thin passthrough to `supabase.auth.signInWithOAuth`. |
| `components/ui/AuthDivider.tsx` | Create | Themed "OR" divider with horizontal lines. Used by sign-in and sign-up. |
| `components/ui/GoogleAuthButton.tsx` | Create | Themed "Continue with Google" button. Hidden on native (`Platform.OS !== "web"`). Calls `useAuth().signInWithGoogle()`. |
| `__tests__/components/ui/GoogleAuthButton.test.tsx` | Create | Render test + press test (mocked auth context). |
| `app/sign-in.tsx` | Modify | Render `<AuthDivider />` + `<GoogleAuthButton />` below the email/password form. |
| `app/sign-up.tsx` | Modify | Same as sign-in, in the not-yet-submitted state. |
| `docs/supabase-setup.md` | Modify | Add Google provider configuration section. |

---

## Task 1: Create `config/oauth-redirect.ts` + tests

**Files:**
- Create: `__tests__/config/oauth-redirect.test.ts`
- Create: `config/oauth-redirect.ts`

This is a pure function. TDD it before touching the provider.

- [ ] **Step 1: Write the failing test**

Create `__tests__/config/oauth-redirect.test.ts`:

```typescript
import { Platform } from "react-native";

import { getGoogleOAuthRedirectTo } from "@/config/oauth-redirect";

describe("getGoogleOAuthRedirectTo", () => {
	const originalOS = Platform.OS;
	const originalLocation = (globalThis as any).location;
	const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		(globalThis as any).location = originalLocation;
		process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
	});

	const setOrigin = (origin: string | undefined) => {
		(globalThis as any).location = origin ? { origin } : undefined;
	};

	it("returns the current origin on web", () => {
		(Platform as any).OS = "web";
		setOrigin("http://localhost:8081");
		expect(getGoogleOAuthRedirectTo()).toBe("http://localhost:8081");
	});

	it("returns a production origin on web", () => {
		(Platform as any).OS = "web";
		setOrigin("https://duo-decide.vercel.app");
		expect(getGoogleOAuthRedirectTo()).toBe("https://duo-decide.vercel.app");
	});

	it("falls back to EXPO_PUBLIC_APP_URL when location is unavailable", () => {
		(Platform as any).OS = "web";
		setOrigin(undefined);
		process.env.EXPO_PUBLIC_APP_URL = "https://configured.example.com";
		expect(getGoogleOAuthRedirectTo()).toBe("https://configured.example.com");
	});

	it("returns undefined when neither location nor env var is set", () => {
		(Platform as any).OS = "web";
		setOrigin(undefined);
		delete process.env.EXPO_PUBLIC_APP_URL;
		expect(getGoogleOAuthRedirectTo()).toBeUndefined();
	});

	it("returns undefined on native (Google SSO not supported here yet)", () => {
		(Platform as any).OS = "ios";
		setOrigin("http://localhost:8081");
		expect(getGoogleOAuthRedirectTo()).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/config/oauth-redirect.test.ts`

Expected: FAIL with `Cannot find module '@/config/oauth-redirect'`.

- [ ] **Step 3: Implement `config/oauth-redirect.ts`**

Create `config/oauth-redirect.ts`:

```typescript
import { Platform } from "react-native";

/**
 * URL Supabase should redirect to after a successful Google OAuth flow.
 * Web only — native Google SSO is not yet supported and returns undefined,
 * which the caller should interpret as "do not initiate the flow".
 *
 * Must be registered in Supabase Dashboard → Auth → URL Configuration.
 */
export function getGoogleOAuthRedirectTo(): string | undefined {
	if (Platform.OS !== "web") return undefined;

	if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location?.origin) {
		return globalThis.location.origin;
	}

	return process.env.EXPO_PUBLIC_APP_URL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/config/oauth-redirect.test.ts`

Expected: PASS — 5 tests.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "oauth-redirect" || echo "no new errors"`

Expected: `no new errors`.

- [ ] **Step 6: Commit**

```bash
git add config/oauth-redirect.ts __tests__/config/oauth-redirect.test.ts
git commit -m "feat: add web OAuth redirect-URL helper for Google SSO"
```

---

## Task 2: Add `signInWithGoogle` to `AuthContext`

**Files:**
- Modify: `context/supabase-provider.tsx`

This is a thin passthrough to `supabase.auth.signInWithOAuth`. No new test — it's three lines and the redirect-URL logic is already tested in Task 1.

- [ ] **Step 1: Add the import**

In `context/supabase-provider.tsx`, find the existing imports near line 8:

```typescript
import { supabase, getEmailRedirectTo, getPasswordResetRedirectTo } from "@/config/supabase";
import { isWebPasswordRecoveryEntry } from "@/config/password-recovery-detection";
```

Add a new line below them:

```typescript
import { getGoogleOAuthRedirectTo } from "@/config/oauth-redirect";
```

- [ ] **Step 2: Extend the `AuthState` type**

In `context/supabase-provider.tsx`, find `AuthState` (around line 13):

```typescript
type AuthState = {
	initialized: boolean;
	session: Session | null;
	isPasswordRecovery: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
};
```

Add `signInWithGoogle` after `signIn`:

```typescript
type AuthState = {
	initialized: boolean;
	session: Session | null;
	isPasswordRecovery: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
};
```

- [ ] **Step 3: Add the default value**

In `context/supabase-provider.tsx`, find the `AuthContext` default value (around line 24):

```typescript
export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	isPasswordRecovery: false,
	signUp: async () => {},
	signIn: async () => {},
	signOut: async () => {},
	resetPassword: async () => {},
	updatePassword: async () => {},
});
```

Add the new entry after `signIn`:

```typescript
export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	isPasswordRecovery: false,
	signUp: async () => {},
	signIn: async () => {},
	signInWithGoogle: async () => {},
	signOut: async () => {},
	resetPassword: async () => {},
	updatePassword: async () => {},
});
```

- [ ] **Step 4: Implement `signInWithGoogle` in the provider**

In `context/supabase-provider.tsx`, find the `signIn` function (around line 61):

```typescript
const signIn = async (email: string, password: string) => {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		console.error("Error signing in:", error);
		throw error; // Propagate so sign-in page can show user-friendly message
	}

	if (data.session) {
		setSession(data.session);
	}
};
```

Add a new function directly below it:

```typescript
const signInWithGoogle = async () => {
	const redirectTo = getGoogleOAuthRedirectTo();
	if (!redirectTo) {
		throw new Error("Google sign-in is only supported on web in this version.");
	}

	const { error } = await supabase.auth.signInWithOAuth({
		provider: "google",
		options: { redirectTo },
	});

	if (error) {
		console.error("Error starting Google sign-in:", error);
		throw error;
	}
	// On web, supabase-js triggers a full-page redirect. No session is set here;
	// the session lands on return via detectSessionInUrl + PKCE, then flows
	// through the existing onAuthStateChange + routing effect.
};
```

- [ ] **Step 5: Pass `signInWithGoogle` through the provider value**

In `context/supabase-provider.tsx`, find the provider value (around line 252):

```typescript
return (
	<AuthContext.Provider
		value={{
			initialized,
			session,
			isPasswordRecovery,
			signUp,
			signIn,
			signOut,
			resetPassword,
			updatePassword,
		}}
	>
		{children}
	</AuthContext.Provider>
);
```

Insert `signInWithGoogle` after `signIn`:

```typescript
return (
	<AuthContext.Provider
		value={{
			initialized,
			session,
			isPasswordRecovery,
			signUp,
			signIn,
			signInWithGoogle,
			signOut,
			resetPassword,
			updatePassword,
		}}
	>
		{children}
	</AuthContext.Provider>
);
```

- [ ] **Step 6: Run typecheck and existing tests**

Run: `npx tsc --noEmit 2>&1 | grep -E "supabase-provider" || echo "no new errors"`

Expected: `no new errors`.

Run: `npx jest`

Expected: PASS — same count as before (1 pre-existing failure in `useDecisionVoting.test.ts` line 103 is acceptable per `current-status.md`).

- [ ] **Step 7: Commit**

```bash
git add context/supabase-provider.tsx
git commit -m "feat: add signInWithGoogle to AuthContext"
```

---

## Task 3: Create `<AuthDivider />` component

**Files:**
- Create: `components/ui/AuthDivider.tsx`

Pure presentational component. No test — visual-only, no logic. (Reusable; not Google-specific. The web-only gating happens at the call sites in Tasks 5 and 6 so a future non-OAuth divider would not need to know about Platform.)

- [ ] **Step 1: Create `components/ui/AuthDivider.tsx`**

```typescript
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";

const Row = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 12px;
	margin-vertical: 8px;
`;

const Line = styled.View<{ colorMode: "light" | "dark" }>`
	flex: 1;
	height: 1px;
	background-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const Label = styled(Text)<{ colorMode: "light" | "dark" }>`
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 1px;
`;

export function AuthDivider() {
	const { colorMode } = useTheme();
	return (
		<Row>
			<Line colorMode={colorMode} />
			<Label colorMode={colorMode}>OR</Label>
			<Line colorMode={colorMode} />
		</Row>
	);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "AuthDivider" || echo "no new errors"`

Expected: `no new errors`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/AuthDivider.tsx
git commit -m "feat: add AuthDivider component for OR separators"
```

---

## Task 4: Create `<GoogleAuthButton />` component + tests

**Files:**
- Create: `__tests__/components/ui/GoogleAuthButton.test.tsx`
- Create: `components/ui/GoogleAuthButton.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/ui/GoogleAuthButton.test.tsx`:

```typescript
import React from "react";
import { Platform } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";
import { AuthContext } from "@/context/supabase-provider";
import { TestWrapper } from "@/test-utils/test-wrapper";

const baseAuth = {
	initialized: true,
	session: null,
	isPasswordRecovery: false,
	signUp: jest.fn(),
	signIn: jest.fn(),
	signInWithGoogle: jest.fn(),
	signOut: jest.fn(),
	resetPassword: jest.fn(),
	updatePassword: jest.fn(),
};

function renderWithAuth(overrides: Partial<typeof baseAuth> = {}) {
	return render(
		<TestWrapper>
			<AuthContext.Provider value={{ ...baseAuth, ...overrides }}>
				<GoogleAuthButton mode="signin" />
			</AuthContext.Provider>
		</TestWrapper>,
	);
}

describe("GoogleAuthButton", () => {
	const originalOS = Platform.OS;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		jest.clearAllMocks();
	});

	it("renders 'Continue with Google' on web", () => {
		(Platform as any).OS = "web";
		const { getByText } = renderWithAuth();
		expect(getByText("Continue with Google")).toBeTruthy();
	});

	it("renders nothing on native (Google SSO web-only for now)", () => {
		(Platform as any).OS = "ios";
		const { queryByText } = renderWithAuth();
		expect(queryByText("Continue with Google")).toBeNull();
	});

	it("calls signInWithGoogle when pressed", async () => {
		(Platform as any).OS = "web";
		const signInWithGoogle = jest.fn();
		const { getByText } = renderWithAuth({ signInWithGoogle });
		fireEvent.press(getByText("Continue with Google"));
		await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
	});

	it("surfaces a user-friendly error if signInWithGoogle throws", async () => {
		(Platform as any).OS = "web";
		const signInWithGoogle = jest.fn().mockRejectedValue(new Error("boom"));
		const { getByText, findByText } = renderWithAuth({ signInWithGoogle });
		fireEvent.press(getByText("Continue with Google"));
		expect(await findByText(/couldn['’]t start google sign-in/i)).toBeTruthy();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/GoogleAuthButton.test.tsx`

Expected: FAIL with `Cannot find module '@/components/ui/GoogleAuthButton'`.

- [ ] **Step 3: Implement `components/ui/GoogleAuthButton.tsx`**

```typescript
import { useState } from "react";
import { ActivityIndicator, Platform } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { useTheme } from "@/context/theme-provider";
import { styled } from "@/lib/styled";

const Container = styled.View`
	gap: 8px;
`;

const ErrorContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#fef2f2" : "#7f1d1d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#fca5a5" : "#dc2626")};
	border-radius: 8px;
	padding: 12px;
`;

const ErrorText = styled(Muted)`
	color: ${({ theme }) => (theme.colorMode === "light" ? "#b91c1c" : "#f87171")};
`;

type Mode = "signin" | "signup";

interface GoogleAuthButtonProps {
	mode: Mode;
}

export function GoogleAuthButton({ mode }: GoogleAuthButtonProps) {
	const { signInWithGoogle } = useAuth();
	const { colorMode } = useTheme();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (Platform.OS !== "web") return null;

	const label = mode === "signup" ? "Continue with Google" : "Continue with Google";

	async function onPress() {
		setError(null);
		setLoading(true);
		try {
			await signInWithGoogle();
			// On success the browser redirects away; no further UI work needed.
		} catch (e: any) {
			setLoading(false);
			setError("Couldn't start Google sign-in. Please try again.");
			console.error("GoogleAuthButton press error:", e);
		}
	}

	return (
		<Container>
			<Button variant="outline" size="default" onPress={onPress} disabled={loading}>
				{loading ? <ActivityIndicator size="small" /> : <Text>{label}</Text>}
			</Button>
			{error && (
				<ErrorContainer colorMode={colorMode}>
					<ErrorText>{error}</ErrorText>
				</ErrorContainer>
			)}
		</Container>
	);
}
```

(Note: the `label` ternary is intentional — same string today, but the `mode` prop keeps the door open for "Sign up with Google" copy later without changing callers.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ui/GoogleAuthButton.test.tsx`

Expected: PASS — 4 tests.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "GoogleAuthButton" || echo "no new errors"`

Expected: `no new errors`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/GoogleAuthButton.tsx __tests__/components/ui/GoogleAuthButton.test.tsx
git commit -m "feat: add GoogleAuthButton component (web-only)"
```

---

## Task 5: Wire Google button into `sign-in.tsx`

**Files:**
- Modify: `app/sign-in.tsx`

- [ ] **Step 1: Add imports**

In `app/sign-in.tsx`, find the existing imports at the top of the file (lines 1-15).

Note the existing line `import { ActivityIndicator, Pressable } from "react-native";` (line 3). Extend it to also import `Platform`:

```typescript
import { ActivityIndicator, Platform, Pressable } from "react-native";
```

Below `import { Text } from "@/components/ui/Text";` add:

```typescript
import { AuthDivider } from "@/components/ui/AuthDivider";
import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";
```

- [ ] **Step 2: Render the divider + Google button in the existing layout (web-gated)**

In `app/sign-in.tsx`, find the `ButtonContainer` block (around line 164):

```typescript
<ButtonContainer>
	<Button
		size="default"
		variant="default"
		onPress={form.handleSubmit(onSubmit)}
		disabled={form.formState.isSubmitting}
	>
		{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign In"}
	</Button>
	<ForgotPasswordRow>
		<Pressable onPress={() => router.push("/forgot-password")} accessibilityRole="link">
			<ForgotPasswordLink colorMode={colorMode}>Forgot password?</ForgotPasswordLink>
		</Pressable>
	</ForgotPasswordRow>
</ButtonContainer>
```

Insert `<AuthDivider />` and `<GoogleAuthButton mode="signin" />` between the email-password `<Button>` and the `<ForgotPasswordRow>`, gated together so iOS/Android don't render an orphaned "OR" divider:

```typescript
<ButtonContainer>
	<Button
		size="default"
		variant="default"
		onPress={form.handleSubmit(onSubmit)}
		disabled={form.formState.isSubmitting}
	>
		{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign In"}
	</Button>
	{Platform.OS === "web" && (
		<>
			<AuthDivider />
			<GoogleAuthButton mode="signin" />
		</>
	)}
	<ForgotPasswordRow>
		<Pressable onPress={() => router.push("/forgot-password")} accessibilityRole="link">
			<ForgotPasswordLink colorMode={colorMode}>Forgot password?</ForgotPasswordLink>
		</Pressable>
	</ForgotPasswordRow>
</ButtonContainer>
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "sign-in" || echo "no new errors"`

Expected: `no new errors`.

- [ ] **Step 4: Commit**

```bash
git add app/sign-in.tsx
git commit -m "feat: show Continue with Google on sign-in screen (web)"
```

---

## Task 6: Wire Google button into `sign-up.tsx`

**Files:**
- Modify: `app/sign-up.tsx`

- [ ] **Step 1: Add imports**

In `app/sign-up.tsx`, find the existing imports (lines 1-15).

The existing line `import { ActivityIndicator } from "react-native";` (line 3) needs `Platform` added:

```typescript
import { ActivityIndicator, Platform } from "react-native";
```

Below `import { Text } from "@/components/ui/Text";` add:

```typescript
import { AuthDivider } from "@/components/ui/AuthDivider";
import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";
```

- [ ] **Step 2: Render the divider + Google button in the pre-submit state (web-gated)**

In `app/sign-up.tsx`, find the `ButtonContainer` inside the `!emailSent` branch (around line 221):

```typescript
<ButtonContainer>
	<Button
		size="default"
		variant="default"
		onPress={form.handleSubmit(onSubmit)}
		disabled={form.formState.isSubmitting}
	>
		{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign Up"}
	</Button>
</ButtonContainer>
```

Add the divider + Google button below the `<Button>`, web-gated so iOS/Android don't show an orphaned divider:

```typescript
<ButtonContainer>
	<Button
		size="default"
		variant="default"
		onPress={form.handleSubmit(onSubmit)}
		disabled={form.formState.isSubmitting}
	>
		{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign Up"}
	</Button>
	{Platform.OS === "web" && (
		<>
			<AuthDivider />
			<GoogleAuthButton mode="signup" />
		</>
	)}
</ButtonContainer>
```

Do NOT add the Google button to the `emailSent` success branch — by then the user has either confirmed via email link or moved on.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "sign-up" || echo "no new errors"`

Expected: `no new errors`.

- [ ] **Step 4: Commit**

```bash
git add app/sign-up.tsx
git commit -m "feat: show Continue with Google on sign-up screen (web)"
```

---

## Task 7: Document setup in `docs/supabase-setup.md`

**Files:**
- Modify: `docs/supabase-setup.md`

Add a new section so future contributors can re-create the OAuth wiring. Append the section below to the end of `docs/supabase-setup.md`.

- [ ] **Step 1: Append Google OAuth setup section**

Append the following to `docs/supabase-setup.md`:

```markdown
## Google OAuth (Web)

Google SSO is enabled via Supabase's Google provider. Web-only as of May 2026; native is a follow-up.

### Google Cloud Console

1. APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorized JavaScript origins:
   - `http://localhost:8081` (dev)
   - Production web origin (e.g. `https://duo-decide.vercel.app`)
3. Authorized redirect URIs:
   - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret.

### Supabase Dashboard

1. Authentication → Providers → Google → toggle ON.
2. Paste Client ID + Client Secret. Save.
3. Authentication → URL Configuration → ensure Site URL and Additional Redirect URLs include every web origin (dev + production).

### Code touchpoints

- `config/oauth-redirect.ts` — builds the `redirectTo` URL for the OAuth call.
- `context/supabase-provider.tsx` — `signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: "google", ... })`.
- `components/ui/GoogleAuthButton.tsx` — renders the button on web; hidden on native.

### Profile + partner linking

The `handle_new_user()` trigger (migration 012) fires on `auth.users` INSERT regardless of provider, so Google sign-ups get a profile row and auto-link to any pending partner invitation (case-insensitive email match on `pending_partner_email`).

**Known limitation:** Google does not populate `raw_user_meta_data->>'display_name'`, so Google-invited partners who auto-link bypass `/setup-partner` and end up with NULL `display_name`. A follow-up will either map Google's `full_name` claim into `display_name` or surface a post-link "set your name" step.
```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase-setup.md
git commit -m "docs: add Google OAuth setup steps"
```

---

## Task 8: Manual smoke test on web

Cannot be automated — needs Google account credentials and the external setup from the prerequisites section.

- [ ] **Step 1: Confirm prerequisites are complete**

Verify the external setup steps at the top of this plan are done:
- Google Cloud OAuth client created.
- Supabase Google provider enabled with Client ID + Secret.
- Supabase URL configuration includes `http://localhost:8081` and production origin.

- [ ] **Step 2: Run dev server**

Run: `npm run web`

Expected: dev server starts on `http://localhost:8081` (or whatever port Expo chooses — check the console).

- [ ] **Step 3: Sign-in screen renders Google button (light + dark)**

Navigate to `/sign-in`. Verify:
- "Continue with Google" button is visible below the existing email/password sign-in.
- "OR" divider sits between the two.
- Toggle light/dark theme (system setting) — divider color, border, and text contrast all look correct.

- [ ] **Step 4: Google sign-in for a brand-new user (no pending invite)**

1. Open an incognito window. Navigate to `/sign-in`.
2. Click "Continue with Google" and sign in with a Google account that has never used the app.
3. Expected:
   - Browser redirects to Google account picker, then back to the app with `?code=` in the URL.
   - Routing effect detects no `couple_id` and no pending invite → user lands on `/setup-partner`.
   - In Supabase Dashboard → Authentication → Users, the new user shows provider `google`.
   - In Supabase Dashboard → Table Editor → `profiles`, a row exists with the user's id and email. `display_name` is NULL (expected — known limitation; documented).

- [ ] **Step 5: Google sign-up via pending invite (auto-link)**

1. From an existing primary account (e.g. `chasewcole@gmail.com`), use `/setup-partner` to invite a Google email you control — e.g. `chasetest70@gmail.com`.
2. Verify a `couples` row exists with `pending_partner_email = chasetest70@gmail.com`.
3. In an incognito window, navigate to `/sign-up` (or `/sign-in` — either works for Google) and click "Continue with Google", picking that Google account.
4. Expected:
   - `handle_new_user()` trigger creates the profile AND auto-links: `couples.user2_id` populated, `pending_partner_email` cleared.
   - User lands directly in `/(protected)/(tabs)` (NOT `/setup-partner`).
   - Both users see each other's decisions / option lists.

- [ ] **Step 6: Returning Google user (already linked)**

1. Sign out. Sign back in via "Continue with Google".
2. Expected: lands in `/(protected)/(tabs)` immediately. No `/setup-partner` detour.

- [ ] **Step 7: Identity-linking check (same email exists as email/password)**

1. Pick an email that you've previously signed up with via email/password (and confirmed).
2. In a fresh incognito window, navigate to `/sign-in` and click "Continue with Google" using that same email.
3. Expected behaviour depends on your Supabase project's identity-linking setting (verified in the external prerequisites). Document what actually happens:
   - **Manual linking only (default for new projects)**: Supabase rejects with an error like "User already registered". The button should surface "Couldn't start Google sign-in…" — confirm the user can still sign in via email/password after this. This is the safer default for v1.
   - **Automatic linking**: Supabase links the Google identity to the existing user and signs them in. Confirm subsequent sign-ins work via both Google AND email/password.
4. Record which mode the project is on so the team knows what to expect in support tickets.

- [ ] **Step 8: Cancel / error flow**

1. Click "Continue with Google", then close the Google consent screen / hit back.
2. Expected: returns to `/sign-in` with no broken state. If the button shows an error toast or red banner ("Couldn't start Google sign-in…"), that is acceptable — the user can retry.

- [ ] **Step 9: Existing email/password flows still work**

1. Sign in with an email/password account → lands in app.
2. Sign up new email/password account → email confirmation prompt.
3. Forgot password flow → unchanged.

- [ ] **Step 10: Update `current-status.md`**

In `/Users/chasecole/personal-work/active/duo-docs/state/current-status.md`, mark the Google SSO line as in-progress or shipped depending on PR state. Example:

```markdown
- [x] **Google SSO (web)** — shipped <date>. Web only; native deferred to follow-up plan. Trigger-based partner linking confirmed working with two Google accounts.
```

- [ ] **Step 11: Commit `current-status.md` change**

```bash
git -C /Users/chasecole/personal-work/active/duo-docs add state/current-status.md
git -C /Users/chasecole/personal-work/active/duo-docs commit -m "status: mark Google SSO (web) shipped"
```
