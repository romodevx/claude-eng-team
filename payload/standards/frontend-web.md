# Standard: Web Frontend (React)
Owner: frontend-sr · Checked by: code-reviewer, qa-sr

- Stack: React + TypeScript by default (JS only if the project chose it); Vite SPA or Next.js
  per ADR (SEO/SSR needs → Next). TanStack Query for server state; Zustand for small client
  state; React Hook Form + Zod; Tailwind or the project's design system.
- Architecture: feature folders mirroring backend modules; components render, hooks/services
  hold logic; domain logic in plain TS modules with unit tests. Components < 150 lines.
- API: client and types generated from OpenAPI; one fetch layer with auth, retries (idempotent
  GETs only) and error mapping to the problem+json envelope.
- Flags: FlagsProvider + useFlag; disabled modules' routes aren't registered; module chunks
  lazy-loaded so disabled modules are never downloaded.
- Performance budgets (CI via Lighthouse CI on key routes): LCP ≤ 2.5 s, INP ≤ 200 ms,
  CLS ≤ 0.1 (p75), initial JS ≤ 170 KB gzip per route; route-level code splitting, image
  optimization, no layout shift from late content.
- Accessibility: WCAG 2.2 AA as acceptance criterion; axe in component and E2E tests;
  keyboard paths tested; forms per rules/ui-forms-and-modals.md.
- Build hardening: per rules/frontend.md (no source maps, no secrets, console stripped).
- States: every data view handles loading, empty, error and partial states.
