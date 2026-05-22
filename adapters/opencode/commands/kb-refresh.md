---
description: Generate project-atlas update proposal
---

Call `project_atlas_scan` with `mode=changed`.

Use the changed files and scan candidates to decide whether stable knowledge changed. If there are no stable knowledge changes, stop and tell the user:

```text
No stable knowledge changes found.
```

When stable knowledge did change, read only the changed source files and nearby files needed to verify the update.

Create a proposal through `project_atlas_propose`.

Quality rules:

- Pass proposal-level `sourceFiles` with every repo-relative source file used as evidence.
- Write only facts proven by changed source files, README files, config file names, or scan output.
- Do not write generic summaries, marketing text, guesses, or future plans.
- Do not write secrets, tokens, passwords, access keys, or raw sensitive values.
- Match each target under `knowledge/**` to the content responsibility.
- Do not write frontmatter. `project_atlas_propose` will add metadata and source hashes.

Do not apply the proposal from OpenCode. Tell the user to run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```
