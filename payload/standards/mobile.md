# Standard: Mobile (React Native)
Owner: mobile-sr · Checked by: code-reviewer, qa-sr, security

- Stack: React Native + TypeScript on **Expo** (managed workflow + dev clients; prebuild when
  native modules need it), Expo Router, TanStack Query, Zustand, Reanimated + Gesture Handler.
  Bare RN only via ADR.
- Architecture: same layering as web — screens render, hooks/services hold logic, shared
  domain/API packages with web in a monorepo when both exist. Generated OpenAPI client.
- Offline & network: explicit offline behavior per screen; retries with backoff for idempotent
  calls; optimistic updates with rollback; secure storage (expo-secure-store/Keychain/
  Keystore) for tokens — never AsyncStorage for secrets.
- Performance budgets (acceptance criteria): cold start TTI ≤ 2 s on a mid-range Android;
  JS bundle and app size tracked per release with a budget; 60 fps lists (FlashList),
  no JS-thread animation work (Reanimated worklets). Lazy-load heavy screens.
- Accessibility: accessibilityLabel/Role/State on interactive elements; dynamic type; touch
  targets ≥ 44 pt; screen-reader paths tested.
- Release hardening: Hermes; Android R8/ProGuard with obfuscation; source maps and dSYMs only
  to the crash reporter (Sentry); no secrets in the bundle; EAS Build with credentials in EAS
  secrets; staged rollouts on the stores (percentage) and EAS Update channels with rollback.
- Tests: Jest + RN Testing Library (unit/component), Maestro E2E on critical journeys in CI.
- Feature flags: same FlagsProvider/useFlag contract as web, fetched at startup and cached.
