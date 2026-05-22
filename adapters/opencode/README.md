# OpenCode Guide For Project Atlas

[English](README.md) | [简体中文](README.zh-CN.md)

Use this guide when you want to run Project Atlas inside OpenCode. It is the main user entry for the OpenCode workflow. Start here for first setup, first knowledge generation, incremental refresh, review, and memory capture.

## Quick Start

### 1. Install Project Atlas

```bash
npm install
npm run build
npm link
```

If you already installed the package globally, verify the commands first:

```bash
project-atlas --help
project-atlas-mcp --help
```

### 2. Copy The OpenCode Adapter Files

Copy these folders into the OpenCode assets location used by your team:

```text
adapters/opencode/lib
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

### 3. Restart OpenCode

Restart OpenCode so it reloads the tools, commands, and skill.

### 4. Run The First Recommended Flow

Use this flow after the target repository already has `knowledge/manifest.json`:

```text
/kb-generate
/kb-check
/kb-review
/kb-status
```

This flow gives you:

- the first knowledge proposal from full scan evidence
- a health check for missing metadata or stale knowledge
- a reviewer summary for the latest proposal
- a final status view before a human decides whether to apply

## Command Map

- `/kb-context`
  Read compact Project Atlas context before broad source search
- `/kb-generate`
  Generate the first knowledge proposal from `mode=full` scan evidence
- `/kb-refresh`
  Generate an incremental knowledge proposal from `mode=changed` scan evidence
- `/kb-check`
  Check knowledge health before trusting or applying generated content
- `/kb-review`
  Review the latest proposal summary and apply safety
- `/kb-status`
  Combine health status and latest proposal status in one pass
- `/kb-remember`
  Capture stable project memory as a proposal

## Advanced Workflows

### Refresh Stable Knowledge

Use this when the repository changed and you want to update durable knowledge instead of generating the first draft again:

```text
/kb-refresh
/kb-check
/kb-review
/kb-status
```

Choose `/kb-refresh` when changed files affect stable project facts, workflows, integrations, or quality risks. If the result says `No stable knowledge changes found.`, stop there and do not force a proposal.

When you refresh an existing knowledge file and need to keep its old evidence scope, use proposal generation with inherited metadata:

```bash
project-atlas propose --repo <repo> --updates-file updates.json --reason "<why>" --inherit-source-metadata
```

### Capture Decisions, Experience, And Facts

Use this when the task produced stable information that should live as project memory:

```text
/kb-remember
/kb-review
```

Good candidates include:

- stable technical decisions
- repeated troubleshooting experience
- durable project facts that future tasks should reuse

Do not turn chat-only context into memory. Every memory proposal must stay tied to real repository source files.

### Proposal Input Rules

Long Markdown content must use file input. Do not pass long generated Markdown directly as inline tool JSON.

Use these rules consistently:

- For multiple generated files, create a temporary `updates.json` and call `project_atlas_propose` with `updatesFile`
- For one generated file, write a temporary Markdown file and call `project_atlas_propose` with `target` and `contentFile`
- Put source evidence in real repo-relative `sourceFiles`
- Do not mix `sourceFiles` with `updatesFile` on the same call. Put `source_files` inside `updates.json` instead

The three rules that keep proposals maintainable are simple:

1. prefer `updatesFile` or `contentFile` for long content
2. bind generated content to real `sourceFiles`
3. keep OpenCode on proposal creation only

### Review Before Any Human Apply

After any `/kb-generate`, `/kb-refresh`, or `/kb-remember`, review the proposal immediately:

```text
/kb-review
/kb-status
```

The review result should help the user see:

- proposal id
- source files
- target files
- dry-run summary
- stale status
- review decision
- apply safety

## Safety Boundary

OpenCode may read context, scan the repository, check knowledge health, create proposals, and review proposal summaries.

OpenCode must not apply knowledge updates.

There is no apply tool in OpenCode. Real writes must be done by a human in a terminal:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```

## Appendix For Maintainers

### Adapter Layout

```text
adapters/opencode/lib
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

### Manual Smoke Test

- Run `project_atlas_scan` in a temporary Git project and confirm it returns scan JSON
- Run `project_atlas_context` with a small query and confirm it returns source paths
- Run `project_atlas_propose` with one target under `knowledge/` and confirm it creates proposal evidence
- Run `project_atlas_remember` with one memory candidate and confirm it creates proposal evidence
- Run `project_atlas_check` and confirm it returns a Project Atlas Check report
- Run `project_atlas_review_summary` after a proposal and confirm it returns apply safety
- Run `/kb-generate` in an initialized temporary Git project and confirm it creates a first knowledge proposal from `mode=full` scan evidence
- Run `/kb-check` after `/kb-generate` or `/kb-refresh` and confirm it reports health issues
- Run `/kb-review` after proposal creation and confirm it summarizes the latest proposal
- Run `/kb-status` and confirm it reports knowledge health and latest proposal status
- Run `/kb-remember` and confirm it creates only a proposal
- Confirm `/kb-generate` does not write `knowledge/**` directly and does not expose apply
- Confirm no `project_atlas_apply` tool exists
- Confirm the proposal output tells the user to run `project-atlas apply` in a terminal
- Confirm batch apply is documented as a terminal command, not an OpenCode tool
