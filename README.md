# Maderobe

> Wardrobe management app — catalogue your clothes from photos, generate outfit
> suggestions, pack a smart travel suitcase.

Solo-developed by [Julien Duval](https://github.com/Actaris51). iOS-only at
launch (Android deferred). 100 % on-device — no tracker, no ads, no account,
no network call for normal use.

- **App Store** (FR + US): *coming soon* (build 11 in review at time of writing)
- **Bundle:** `com.maderobe.app`
- **Privacy policy** (also served from this repo via GitHub Pages):
  <https://actaris51.github.io/maderobe/privacy-policy.html>

---

## App — Expo SDK 54 + React Native 0.81

Source lives at the root of this repo. Tech stack:

- **Framework:** Expo SDK 54 + React Native 0.81 + TypeScript
- **Navigation:** expo-router 6 (file-based)
- **State:** Zustand + AsyncStorage (persist middleware)
- **Animation:** react-native-reanimated 4
- **On-device ML:** local Expo module `MaderobeVision` (Swift) wrapping
  Apple Vision API (classification + dominant-color extraction +
  background removal via `VNGenerateForegroundInstanceMaskRequest`)

### Get started

```bash
npm install
```

Then either run a dev build (recommended) or use Expo Go:

```bash
# Dev build (requires `eas build --profile development` first)
npx expo start --dev-client --lan

# Expo Go (limited — no MaderobeVision native module)
npx expo start
```

### Project layout

```
app/                      # expo-router screens (file-based routing)
components/               # reusable React components
constants/                # design system (motion, theme, taxonomy, photo guides)
hooks/                    # custom React hooks
lib/                      # pure-JS utilities (color, outfit gen, packing, weather)
modules/maderobe-vision/  # local Expo module (Swift)
stores/                   # Zustand stores
store-assets/             # screenshots + metadata for App Store Connect
scripts/                  # one-shot Python scripts (icon, screenshots, textures)
patches/                  # patch-package patches (e.g. iOS 26 TurboModule fix)
assets/flat-lay/          # procedural background textures (generated)
index.html + privacy-*    # see "Website" section below — served from repo root via GitHub Pages
```

### Building for production

```bash
eas build --platform ios --profile production --auto-submit
```

EAS Free quota is 30 builds/month total across all projects — burns fast on a
multi-project account, plan accordingly.

### Notes

- iOS 26 + RN new arch combo requires the `RCTTurboModule.mm` patch in
  `patches/react-native+0.81.5.patch` (applied via `patch-package` post-install)
  + `buildReactNativeFromSource: true` in `expo-build-properties`. See
  `shared-knowledge/projects.md` (in the parent Claude knowledge base) for the
  full backstory.
- `expo-updates` is intentionally NOT installed in the shipped binary. It will
  be re-added in a future build with proper `eas update:configure` to enable
  OTA updates without burning EAS builds.

---

## Website (GitHub Pages)

A handful of static HTML files at the repo root are served from
<https://actaris51.github.io/maderobe/> (GitHub Pages on the `main` branch
root folder). They host the app's landing page and the App Store privacy URL.

### Files

| File | URL |
|---|---|
| `index.html` | <https://actaris51.github.io/maderobe/> |
| `privacy-policy.html` | <https://actaris51.github.io/maderobe/privacy-policy.html> |
| `privacy-policy-en.html` | <https://actaris51.github.io/maderobe/privacy-policy-en.html> |
| `favicon.png` | <https://actaris51.github.io/maderobe/favicon.png> |

### Updating

Edit the HTML files, push to the `main` branch. GitHub Pages redeploys
automatically within 1-2 minutes.

### Maintenance notes

- Bump the "Dernière mise à jour / Last updated" date when changing the policy.
- If a change broadens data collection or sharing, announce it in-app too
  (see policy §8).
- The privacy URL is the one declared in App Store Connect; don't break it.

---

## License

Proprietary — all rights reserved.
