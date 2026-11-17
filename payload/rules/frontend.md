---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/package.json"
  - "**/vite.config.*"
  - "**/app.json"
  - "**/app.config.*"
  - "**/metro.config.*"
---
## Frontend (React web & React Native) — detail in `~/.claude/standards/frontend-web.md` and `mobile.md`
- No business logic in components: it lives in hooks/services/domain modules; components
  render state. Server state with TanStack Query; client state minimal (Zustand when needed).
- API types and clients GENERATED from the OpenAPI contract; never hand-written.
- Accessibility (WCAG 2.2 AA web; platform a11y APIs on mobile) is an acceptance criterion.
- Performance budgets are acceptance criteria: Core Web Vitals (LCP ≤ 2.5 s, INP ≤ 200 ms,
  CLS ≤ 0.1) and JS budget on web; cold start and bundle size on mobile. Lazy-load routes.
- Production builds minified/tree-shaken and WITHOUT source maps (Vite `build.sourcemap:false`,
  Next `productionBrowserSourceMaps:false`); mobile: Hermes bytecode, R8/ProGuard on Android,
  source maps uploaded only to the crash reporter, never shipped. CI fails on `*.map` or
  `sourceMappingURL` in artifacts. No secrets or internal URLs in bundles; console stripped.
- TDD: failing component test first (Vitest/Jest + Testing Library).
