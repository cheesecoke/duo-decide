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

You don't have to judge this by hand: the runtime version is a fingerprint
of the native project (see Runtime version), so an update can only reach
binaries whose native side matches. If you publish an update after a native
change, no installed build picks it up; you need a build.

## Commands

**Native change: a new build** (bump `expo.version` first only if this build
is going to the App Store as a new version, see Versions):

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

`app.json` sets `runtimeVersion: { "policy": "fingerprint" }`: the runtime is
a hash of everything that affects the native app (native dependencies,
config plugins, native `app.json` config, the Expo SDK). An update reaches
only builds with the same hash. So:

- A JS-only change keeps the hash: `npm run update:prod` reaches every
  installed build on that runtime.
- A native change produces a new hash. Updates published after it reach
  only builds made after it, so old binaries never get JS that calls native
  code they don't have. Nothing to remember.
- Check before publishing: `npx @expo/fingerprint .` prints the current hash;
  `eas update` uses the same value. `eas build:list` / the EAS dashboard
  show each build's runtime.
- The switch from `appVersion` (2026-11) changed the runtime, so builds made
  before it (TestFlight builds up to that point) no longer receive updates.
  The first build after it is the first one on the new policy.

## Versions

`expo.version` is the App Store version users see (`1.0.0`). It no longer
controls OTA, so bump it only for a new App Store release: after `1.0.0` is
approved, the next submitted version must be `1.0.1` or higher. TestFlight-only
builds can stay on the same version; `buildNumber` is incremented remotely on
every build (`appVersionSource: remote` + `autoIncrement`).

## Rollback

```sh
eas update:rollback            # interactive: pick the update to roll back
eas update:rollback <GROUP_ID> # republish the update before it (or the
                               # build's embedded bundle if there is none)
```

Or republish an older update: `eas update:republish --group <GROUP_ID>`.
`eas update:list --branch production` shows the group ids. Devices pick the
rollback up the same way as any update (next cold start).

## Monitoring (Sentry)

Crashes and JS errors report to Sentry from iOS and web (`lib/sentry.ts`,
initialised in `app/_layout.tsx`). It is off without a DSN and in development.

| Variable                 | Where                                             | What                                      |
| ------------------------ | ------------------------------------------------- | ----------------------------------------- |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS `preview` + `production` environments, Vercel | Turns reporting on. Public by design.     |
| `SENTRY_AUTH_TOKEN`      | EAS environments, as a **secret**                 | Uploads source maps during `eas build`.   |
| `SENTRY_ORG`             | EAS environments                                  | Sentry org slug, for the source map step. |
| `SENTRY_PROJECT`         | EAS environments                                  | Sentry project slug.                      |

Set all four before the next build: the iOS build uploads source maps and
expects them. To build without Sentry set up, set
`SENTRY_DISABLE_AUTO_UPLOAD=true` in that EAS environment. After an OTA update, upload its
source maps so stack traces are readable:

```sh
npm run update:prod -- --message "..."
npx eas-cli env:exec production 'npx sentry-expo-upload-sourcemaps dist'
```

Each event carries the EAS Update id, channel and runtime version, so a bad
update is visible as its own release. The `environment` tag is the update
channel (`production`, `preview`) or `web`.

Privacy: crash and diagnostic data only. No PII, no user id, no session
replay, no tracing. Declare "Crash Data" and "Other Diagnostic Data", not
linked to the user and not used for tracking, in App Store Connect's App
Privacy section.

## Apple's rules

Apple allows downloaded JavaScript for bug fixes and improvements, as long as
it does not change the app's primary purpose, add features that would need
App Review, or get around review. Treat OTA as the channel for fixes, polish
and copy. A new feature or a change in what the app does goes through a build
and App Review.
