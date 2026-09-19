# React Native Reusables components

Vendored from [React Native Reusables](https://reactnativereusables.com)
(`packages/registry/src/nativewind/`), one directory per component.

The `@react-native-reusables/cli add` command could not be used: it hangs with
no output, and its registry endpoint (`https://reactnativereusables.com/r/*.json`)
returns 404. Files were fetched from the upstream repo instead and their
registry-internal imports rewritten to this project's aliases:

| upstream                                   | here                                  |
| ------------------------------------------ | ------------------------------------- |
| `@/registry/nativewind/components/ui/text` | `@/components/ui/reusables/text/text` |
| `@/registry/nativewind/lib/utils`          | `@/lib/utils`                         |

Nothing else is edited, so re-running the CLI later produces a clean diff.

Note: the upstream variants reference shadcn tokens (`bg-primary`,
`text-foreground`, ...) that this project's `tailwind.config.js` does not
define — those classes compile to nothing. Duo styling is applied at the call
site with the tokens from `design-refs/tokens.md` (see `button.stories.tsx`).
