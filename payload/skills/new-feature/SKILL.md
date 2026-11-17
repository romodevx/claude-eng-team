---
name: new-feature
description: >
  Implements a feature inside an existing module. Use on /new-feature, "agrega", "add
  functionality", "implement", "quiero que haga X".
---

# /new-feature — Feature in an existing module

1. @product-owner: owning module; story with Given/When/Then criteria.
2. @architect: contract impact → update `openapi.yaml` FIRST if endpoints change; ADR if the
   design changes. @security `/threat-model` if user data/auth/payments.
3. @project-manager: subtasks and branches (skip for a single-subtask feature).
4. Deliver with `/story` (story branch, subtask PRs with QA + code review, PR to dev with the
   owner's confirmation). TDD; backend before frontend.
