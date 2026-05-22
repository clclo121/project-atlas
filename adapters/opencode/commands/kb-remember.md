---
description: Create project-atlas memory proposal
---

Use this command when the task produced stable project memory, such as a decision, an experience, or a project fact.

Prepare memory candidates from verified source files only. Then call `project_atlas_remember`.

Each call must include:

- `sourceFiles`: repo-relative source evidence files
- `memories`: one or more memory items
- `reason`: why this memory should be captured

Each memory item must include:

- target under `knowledge/**`
- memory type: `decision`, `experience`, or `project_fact`
- topic
- scope
- confidence
- summary
- body

Do not capture chat-only context. Do not write secrets, tokens, passwords, access keys, or raw sensitive values.

The command only creates a proposal. Do not apply the proposal from OpenCode. Tell the user that a human must review the proposal and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```
