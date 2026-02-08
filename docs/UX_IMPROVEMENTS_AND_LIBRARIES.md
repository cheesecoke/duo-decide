# UX Improvements & React Native Libraries

Reference for bugs/improvements and recommended libraries. Duo is **React Native + Expo**; all suggestions are RN-compatible.

---

## 1. Sign-in: validation & error feedback

### Bug (fixed in code)

**Cause:** In `context/supabase-provider.tsx`, `signIn()` does `if (error) { console.error(...); return; }` and never **throws**. The sign-in page uses try/catch and `setSigninError()`, so it never sees an error when Supabase returns one (wrong credentials, network down, etc.).

**Fix:** In the provider, **throw** the error so the UI can catch and display it: `if (error) throw error;`. See the change in `context/supabase-provider.tsx`.

### Libraries (you already have these)

- **React Hook Form** – [react-hook-form](https://react-hook-form.com/) – form state, `handleSubmit`, `formState.isSubmitting`, `formState.errors`. ✅ In use on sign-in.
- **Zod** – [zod](https://zod.dev/) – schema validation with `zodResolver` for RHF. ✅ In use.
- **@hookform/resolvers** – connects Zod (or Yup, etc.) to RHF. ✅ In use.

No extra library needed. Ensure the auth provider throws on `signIn`/`signUp` errors and that the sign-in page maps Supabase error codes to friendly messages (including network / “something went wrong”). Optional: use Supabase’s `AuthApiError` and `isAuthApiError()` for more precise handling ([Supabase error codes](https://supabase.com/docs/guides/auth/debugging/error-codes)).

---

## 2. Sign-in page layout: centered card

No new library. Use your existing layout and Emotion styling:

- Wrap the form (title + error banner + fields + button) in a **card**-style container (e.g. `styled.View` with background, border radius, padding, optional shadow).
- Center that card in the content area (e.g. `flex: 1`, `justifyContent: 'center'`, `alignItems: 'center'`, or a max-width + `alignSelf: 'center'`).
- On larger viewports (web), you can use a fixed max-width (e.g. 400px) so the card doesn’t stretch too wide.

Reuse your theme (e.g. `getColor('card', colorMode)`, `getColor('border', colorMode)`) so it stays consistent with the rest of the app.

---

## 3. Styling impact: minimalistic but luxurious (animations & responsiveness)

Goal: subtle animations (e.g. voting/polling), micro-interactions, and clear feedback when something happens.

### Recommended libraries

| Library | Purpose | Notes |
|--------|---------|--------|
| **React Native Reanimated** | Declarative animations, layout animations, gestures | ✅ Already in the project. Use for enter/exit, springs, and feedback on vote/poll actions. |
| **Moti** | Simpler API on top of Reanimated (e.g. `from` / `animate` / `exit`) | [moti](https://moti.fyi/). Works with Expo and Reanimated 3. Reduces boilerplate for subtle fades, scales, and layout transitions. |
| **react-native-gesture-handler** | Touch/gesture handling | ✅ Already in the project. Use with Reanimated for drag/press feedback. |

Optional:

- **Moti Interactions** – [Moti Interactions](https://moti.fyi/interactions/overview) – `MotiPressable` for press/hover micro-interactions without extra re-renders (uses worklets). Good for buttons and cards.
- **react-native-micro-interactions** – [GitHub](https://github.com/Sardar1208/react-native-micro-interactions) – prebuilt micro-interactions; evaluate bundle size and API vs. building with Reanimated/Moti.

**Practical approach:** Prefer **Reanimated + Moti** (and your existing Button animation styles) for voting/polling feedback (e.g. checkmark animation, card highlight, success state) and for list/card enter/exit. Add Moti only if you want a simpler API; otherwise Reanimated alone is enough.

---

## 4. Background graphics (large viewports, desktop)

Goal: More interesting background on big screens (e.g. centered white content with decorative graphics, characters, or animals that can rotate/change on sign-in or reload), while keeping mobile as-is.

### Recommended options

| Option | Library / approach | Use case |
|-------|--------------------|----------|
| **Lottie** | [lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) | Cute characters, animals, small animations. Designer-made JSON animations; can randomize which file plays on load/sign-in. |
| **Static or light SVG** | **react-native-svg** (✅ already in project) | Decorative shapes, illustrations, or “spot” graphics. Use Reanimated for light motion (e.g. gentle float or rotation). |
| **Illustration assets** | e.g. [unDraw](https://undraw.co/), [Storyset](https://storyset.com/), or custom SVGs | Export SVG, use with `react-native-svg` (and optionally animate parts with Reanimated). |

**Implementation idea:**

- In `ContentLayout` (or a wrapper used only on web/large breakpoints), render a full-screen “background” layer behind the main content.
- On that layer, render 1–3 Lottie or SVG elements (e.g. sushi, characters, animals) with random selection or rotation on mount/sign-in/reload (e.g. `useEffect` + `Math.random()` to pick index or variant).
- Keep animations subtle and low-FPS-friendly so the main content stays snappy.

**Lottie resources:** [LottieFiles](https://lottiefiles.com/) has many free animations; filter for “character”, “food”, “couple”, etc., and export JSON for `lottie-react-native`.

---

## 5. Icons and typography

### Icons

| Library | Pros | Cons |
|--------|------|------|
| **@expo/vector-icons** | Bundled with Expo, zero config, multiple sets (Ionicons, MaterialIcons, etc.) | Look “standard”; may feel generic. |
| **phosphor-react-native** | [phosphor-react-native](https://www.npmjs.com/package/phosphor-react-native) – clean, multiple weights (regular, bold, fill, duotone), tree-shakeable | Depends on `react-native-svg` (you have it). |
| **lucide-react-native** | [lucide-react-native](https://lucide.dev/guide/packages/lucide-react-native) – consistent, modern set | Some Expo dev/build issues reported; ensure `react-native-svg` version is compatible and test in your build. |

Recommendation: Try **phosphor-react-native** for a more distinctive, cohesive set with flexible weights; keep **@expo/vector-icons** as fallback or for icons Phosphor doesn’t have. You can migrate gradually from your current `assets/icons` components by wrapping Phosphor (or Lucide) in your own icon API so the rest of the app stays unchanged.

### Typography

| Approach | Details |
|---------|--------|
| **expo-font** | [Expo Fonts](https://docs.expo.dev/develop/user-interface/fonts/). Load custom TTF/OTF from `assets/fonts/` (e.g. `useFonts`) or embed via `app.json` config plugin for faster startup. |
| **@expo-google-fonts/*** | e.g. `@expo-google-fonts/inter`, `@expo-google-fonts/plus-jakarta-sans`. Easy way to get a distinctive but readable typeface without managing font files manually. |

Recommendation: Pick one readable, “premium” font (e.g. **Plus Jakarta Sans**, **DM Sans**, or **Outfit**) and use it for headings and body in your existing `typography.tsx` / theme. Use **expo-font** with local files or a Google Fonts Expo package; keep your current text components and only change `fontFamily` (and optionally weight/size scale) for a more luxurious feel.

---

## Summary

| # | Area | New library? | Action |
|---|------|--------------|--------|
| 1 | Sign-in validation & errors | No | Fix provider to throw on sign-in/sign-up error; keep RHF + Zod; optionally refine Supabase error mapping. |
| 2 | Sign-in layout | No | Center form in a card with existing layout + Emotion. |
| 3 | Animations & responsiveness | Optional: Moti | Use Reanimated (and optionally Moti) for voting/polling and micro-interactions. |
| 4 | Background graphics | **lottie-react-native** and/or **react-native-svg** | Add a background layer for large viewports; Lottie + SVG with light randomization. |
| 5 | Icons | **phosphor-react-native** (or Lucide) | Add and gradually adopt; keep Expo vector-icons as fallback. |
| 5 | Typography | **expo-font** + **@expo-google-fonts/*** or local fonts | Load one premium font and wire it into your theme/typography. |

---

## Quick install commands (when you’re ready)

```bash
# Animations (optional)
npx expo install moti

# Background
npx expo install lottie-react-native

# Icons (you have react-native-svg)
npm install phosphor-react-native

# Typography (pick one family)
npx expo install @expo-google-fonts/plus-jakarta-sans expo-font
```

Then in your root layout, load fonts (e.g. `useFonts` from `expo-font`) and apply the font family in your theme/typography components.
