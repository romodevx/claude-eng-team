---
name: react-native-expo
description: >
  In-house React Native + Expo engineering guide for this team: project setup (Expo Router,
  dev clients, EAS), architecture without business logic in screens, data with TanStack Query
  and the generated OpenAPI client, offline and secure storage, performance budgets (startup,
  bundle, lists, animations), accessibility, testing (Jest/RNTL, Maestro) and hardened releases
  (Hermes, R8, Sentry source maps, staged rollouts, EAS Update rollback). Use when building,
  reviewing or releasing a React Native/Expo app.
---

# React Native + Expo (team standard: `~/.claude/standards/mobile.md`)

Check current Expo SDK / React Native versions with Context7 before writing setup code; APIs
move every SDK release.

## 1. Setup
- `npx create-expo-app@latest` (TypeScript template) → Expo Router; dev clients
  (`expo-dev-client`) as soon as a native module is needed; `app.config.ts` reads env per
  profile (12-factor) — only `EXPO_PUBLIC_*` reaches the bundle and is public by definition.
- `eas.json` profiles: development, preview, production; credentials and secrets in EAS.
- Monorepo with web: shared `packages/domain` and `packages/api-client` (generated from
  OpenAPI); screens never import from another app.

## 2. Architecture
- `app/` routes only compose; `features/<module>/` holds hooks, services, components;
  `domain/` pure TS with unit tests. A screen that calculates prices, permissions or states is
  a review BLOCKER.
- Server state: TanStack Query (staleTime per resource, retries only for idempotent GETs,
  `onlineManager` wired to NetInfo, persisted cache when offline reading matters).
- Mutations: Idempotency-Key header; optimistic update + rollback on error.
- Flags: same FlagsProvider/useFlag contract as web; disabled modules' routes not rendered.

## 3. Security
- Tokens in `expo-secure-store`; never AsyncStorage/MMKV for secrets. Assume the binary is
  public: no API secrets in the app. OAuth with PKCE (`expo-auth-session`).
- Certificate pinning for high-risk apps; jailbreak/root signals only as telemetry.
- Release: Hermes on; Android `minifyEnabled` + R8 obfuscation; source maps/dSYMs uploaded to
  Sentry only (`@sentry/react-native` Expo plugin), never in the bundle.

## 4. Performance budgets (acceptance criteria)
- Cold start TTI ≤ 2 s on a mid-range Android; measure on device, release build.
- Lists: FlashList with `estimatedItemSize`; memoized rows; no inline heavy closures.
- Animations: Reanimated worklets / layout animations on the UI thread (see `animate-expo`).
- Images: `expo-image` with caching and proper sizes. Lazy-load heavy screens/modules.
- Track JS bundle and app size per release (`npx expo export` stats / EAS build size); a
  regression > 10% needs a justification in the PR.

## 5. Accessibility
`accessibilityRole/Label/State/Hint` on every interactive element; respect font scaling;
targets ≥ 44 pt; test with VoiceOver and TalkBack on critical journeys.

## 6. Testing
- TDD with Jest + React Native Testing Library (query by role/label, not testID first).
- MSW for network in component tests; Maestro flows for critical journeys in CI (preview build).

## 7. Release
- Versioning: SemVer app version + auto-incremented build numbers in EAS.
- Store: staged rollout (Play % rollout, App Store phased release) — submissions need the
  owner's yes. OTA: EAS Update channels per environment; JS-only fixes via update; rollback by
  republishing the previous update. Native changes always require a new build.
