---
name: flags
description: >
  Manage module feature flags: list, enable, disable, and apply presentation
  presets. Use whenever the user says /flags, "activa el módulo", "esconde",
  "modo demo", "presentation mode", "qué módulos están activos".
---

# /flags — Feature Flag Management

## Subcommands
- /flags list [env]            → table: key | enabled | environments | gated?
- /flags enable <key> [env] [--percent N]  → REFUSE if gates not passed; shared envs need the owner's yes
- /flags disable <key> [env]
- /flags preset save <name>    → snapshot current enabled set as a preset
- /flags preset <name> [env]   → apply preset (e.g., demo-clientX shows only
                                  chosen modules)

## Rules
- New flags default OFF
- Enabling in staging/production requires the module's security+tech-lead gates
- Presets are stored in docs/project-specs/FLAG-PRESETS.md + flags storage
- After any change, run the QA smoke for the resulting flag combination
