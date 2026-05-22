---
description: Generate project-atlas update proposal
---

## Scenario

Use this command when the repository already has knowledge and changed source files may require a stable knowledge update.

## Input Rules

Call `project_atlas_scan` with `mode=changed`.

Use the changed files and scan candidates to decide whether stable knowledge changed. If there are no stable knowledge changes, stop and tell the user:

```text
No stable knowledge changes found.
```

When stable knowledge did change, read only the changed source files and nearby files needed to verify the update.

Create the proposal through `project_atlas_propose`.

Long Markdown content must use file input. Do not pass long generated Markdown directly as inline tool JSON.

- for multiple files, create a temporary `updates.json` with `source_files` and `updates`, then call `project_atlas_propose` with `updatesFile=<path>`
- for one file, write the Markdown to a temporary content file, then call `project_atlas_propose` with `target=<knowledge path>`, `contentFile=<path>`, and `sourceFiles=[...]`
- do not pass `sourceFiles` together with `updatesFile`
- when using `updatesFile`, put source evidence under `source_files` inside that JSON file
- temporary files may live under `.project-atlas/tmp/` or the system temp directory
- do not write generated content directly into `knowledge/**`
- inline `updates` are only for short content where JSON arguments stay small and simple

Quality rules:

- pass proposal-level `sourceFiles` with every repo-relative source file used as evidence
- write only facts proven by changed source files, README files, config file names, or scan output
- do not write generic summaries, marketing text, guesses, or future plans
- do not write secrets, tokens, passwords, access keys, or raw sensitive values
- match each target under `knowledge/**` to the content responsibility
- do not write frontmatter. `project_atlas_propose` will add metadata and source hashes

## Success Result

Return an incremental knowledge proposal that only covers stable changes proven by the current diff and nearby evidence.

## Safety Boundary

Do not apply the proposal from OpenCode. Tell the user to run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
