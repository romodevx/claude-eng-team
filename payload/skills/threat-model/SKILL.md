---
name: threat-model
description: >
  STRIDE threat model plus OWASP ASVS mapping before building any feature that touches user
  data, authentication/authorization or payments. Use on /threat-model, "modelo de amenazas",
  "STRIDE", or automatically from /story and /new-module when those data types are involved.
---

# /threat-model <feature> — @security

1. Template `~/.claude/templates/threat-model.md` → `docs/security/threat-model-<feature>.md`.
2. Ground it in the code: run the `security-threat-model` skill on the affected paths
   (trust boundaries, assets, abuse paths), then classify every threat by STRIDE.
3. Assets and data classification, actors, entry points; mermaid DFD with trust boundaries.
4. STRIDE per element: threat → mitigation → verifying test/config.
5. ASVS level (checklist: `~/.claude/standards/asvs-checklist.md`) — L2 default, L3 payments/health — and chapter mapping.
6. Mitigations become acceptance criteria/tasks in the story (with @product-owner).
7. Residual risks presented to the owner for explicit acceptance.
