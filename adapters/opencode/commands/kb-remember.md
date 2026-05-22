---
description: Create project-atlas memory proposal
---

## Scenario

Use this command when the task produced stable project memory, such as a decision, an experience, or a project fact.

## Input Rules

Prepare memory candidates from verified source files only. Then call `project_atlas_remember`.

Each call must include:

- `sourceFiles`
- `memories`
- `reason`

Each memory item must include:

- target under `knowledge/**`
- memory type: `decision`, `experience`, or `project_fact`
- topic
- scope
- confidence
- summary
- body

Do not capture chat-only context. Do not write secrets, tokens, passwords, access keys, or raw sensitive values.

## Success Result

Return a memory proposal that records stable project memory without writing directly into `knowledge/**`.

## Safety Boundary

The command only creates a proposal. Do not apply the proposal from OpenCode. Tell the user that a human must review the proposal and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
