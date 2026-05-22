# OpenCode Adapter Example

This adapter shows how OpenCode can call `project-atlas` without making OpenCode the core product.

## Install

1. Install and build `project-atlas`.

```bash
npm install
npm run build
npm link
```

2. Copy this adapter folder into the matching OpenCode assets location used by your team.

```text
adapters/opencode/lib
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

3. Restart OpenCode so it reloads the tools, commands, and skill.

## Commands

- `/kb-context` reads a compact Project Atlas context pack for the current task.
- `/kb-refresh` scans the current diff and creates an update proposal when stable knowledge changed.
- `/kb-generate` generates first knowledge content from a full scan.
- `/kb-check` checks knowledge health before review or apply.
- `/kb-review` prints the latest proposal review summary and apply safety.
- `/kb-status` checks knowledge health and latest proposal status in one command.
- `/kb-remember` creates project memory proposals from verified source files.

`/kb-generate` follows the existing `knowledge/` structure. It generates the project overview and glossary, then adds domain, workflow, integration, and quality files only when the scan result has evidence. It does not fill contracts or decisions without direct source evidence.

The generated content must stay tied to source files. The command asks OpenCode to call `project_atlas_propose` with `sourceFiles` for every update, so Project Atlas can add source hashes and proposal metadata.

Recommended first setup flow:

```text
/kb-generate
/kb-check
/kb-review
/kb-status
```

Recommended daily update flow:

```text
/kb-refresh
/kb-check
/kb-review
/kb-status
```

Recommended memory capture flow:

```text
/kb-remember
/kb-review
```

The tools only call read, scan, check, review, and proposal commands. There is no apply tool. Real writes must be done by a human in a terminal:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```

## Manual Smoke Test

- Run `project_atlas_scan` in a temporary Git project and confirm it returns scan JSON.
- Run `project_atlas_context` with a small query and confirm it returns source paths.
- Run `project_atlas_propose` with one target under `knowledge/` and confirm it creates proposal evidence.
- Run `project_atlas_remember` with one memory candidate and confirm it creates proposal evidence.
- Run `project_atlas_check` and confirm it returns a Project Atlas Check report.
- Run `project_atlas_review_summary` after a proposal and confirm it returns apply safety.
- Run `/kb-generate` in an initialized temporary Git project and confirm it creates a first knowledge proposal from `mode=full` scan evidence.
- Run `/kb-check` after `/kb-generate` or `/kb-refresh` and confirm it reports health issues.
- Run `/kb-review` after proposal creation and confirm it summarizes the latest proposal.
- Run `/kb-status` and confirm it reports knowledge health and latest proposal status.
- Run `/kb-remember` and confirm it creates only a proposal.
- Confirm `/kb-generate` does not write `knowledge/**` directly and does not expose apply.
- Confirm no `project_atlas_apply` tool exists.
- Confirm the proposal output tells the user to run `project-atlas apply` in a terminal.
