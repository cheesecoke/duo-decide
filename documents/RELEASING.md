# Releasing

Duo ships to iOS through EAS Build → TestFlight → the App Store, and ships
JavaScript-only changes over the air (OTA) with EAS Update (`expo-updates`).
The web build is separate: Vercel runs `npm run build` (`expo export --platform
web`) on every push to `main`, and OTA has nothing to do with it.

## Build or update?

| Change                                                                   | Ships how     |
| ------------------------------------------------------------------------ | ------------- |
| JS / TS (screens, hooks, `lib/`), styles and NativeWind classes, copy    | OTA           |
| Images and fonts imported from JS (`require("./x.png")`, bundled assets) | OTA           |
| Supabase queries, as long as the database migration is already pushed    | OTA           |
| A new or upgraded native module, or a config plugin                      | **New build** |
| Native config in `app.json`: plugins, `ios.*`, permissions, `scheme`     | **New build** |
| App icon, splash screen                                                  | **New build** |
| Expo SDK or React Native upgrade                                         | **New build** |
| A `version` bump (it changes the runtime, see below)                     | **New build** |

When in doubt, build. An update that calls native code the installed binary
does not have crashes on launch.

## Commands

**Native change: a new build** (bump `expo.version` in `app.json` first if
anything native changed, see Runtime version):

```sh
eas build -p ios --profile production --auto-submit
```

The build gets the `production` channel and the `production` EAS environment
(the `EXPO_PUBLIC_SUPABASE_*` values), `buildNumber` is incremented remotely,
and `--auto-submit` sends it to App Store Connect / TestFlight.

**JS-only change: an OTA update:**

```sh
npm run update:prod -- --message "Fix the vote button on round 3"
npm run update:preview -- --message "..."   # internal preview builds
```

These run `eas update --channel <name> --environment <name>`. The
`--environment` flag matters: `EXPO_PUBLIC_*` variables are inlined into the
JS bundle at export time, so an update published without it would ship a
bundle with no Supabase URL or key. Both scripts need `eas-cli` ≥ 16
(`npm i -g eas-cli`, or prefix with `npx eas-cli@latest`).

## The first OTA-capable build

Builds made before `expo-updates` was installed cannot receive updates at all.
The **next** build after this change is the first one that can. Until a build
with `expo-updates` is the one people have installed, every fix still needs a
build.

## How a device picks up an update

- `updates.checkAutomatically: "ON_LOAD"`: each cold start checks for an
  update on the device's channel and runtime version.
- `fallbackToCacheTimeout: 0`: the app never waits for the network. It
  launches the bundle it already has and downloads the new one in the
  background; the new one runs on the **next** cold start.
- `hooks/useOtaUpdates.ts` also checks (and downloads) whenever the app comes
  back to the foreground, so a phone that keeps Duo suspended for days still
  gets the update ready. It never reloads the app itself. It is off in
  development, on web and in Expo Go / dev clients.

So after `npm run update:prod`, expect a user to see the change on their
second launch, or on the first cold start after a foreground check.

## Runtime version

`app.json` sets `runtimeVersion: { "policy": "appVersion" }`: the runtime is
`expo.version` (e.g. `1.0.0`). An update reaches only builds with the same
runtime. So:

- A native change → bump `version` (`1.0.0` → `1.1.0`) → build. Old binaries
  stay on `1.0.0` and keep receiving `1.0.0` updates until people update from
  the App Store; the new binary gets only `1.1.0` updates.
- `buildNumber` is not part of the runtime, so the remote `autoIncrement`
  does not split runtimes.
- **The one rule:** never ship a native change without bumping `version`.
  With this policy nothing detects it for you.

## Rollback

```sh
eas update:rollback            # interactive: pick the update to roll back
eas update:rollback <GROUP_ID> # republish the update before it (or the
                               # build's embedded bundle if there is none)
```

Or republish an older update: `eas update:republish --group <GROUP_ID>`.
`eas update:list --branch production` shows the group ids. Devices pick the
rollback up the same way as any update (next cold start).

## Apple's rules

Apple allows downloaded JavaScript for bug fixes and improvements, as long as
it does not change the app's primary purpose, add features that would need
App Review, or get around review. Treat OTA as the channel for fixes, polish
and copy. A new feature or a change in what the app does goes through a build
and App Review.
