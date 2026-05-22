# Agent Quickstart

This page is for AI coding agents. The goal is to read governed project knowledge in the first 60 seconds of a task, check knowledge health, and create reviewable proposals when durable knowledge should change.

If you are a human user who wants the shortest command path first, read [Quick Start](quick-start.md).

## Rules

- Read Project Atlas context before broad source exploration.
- Default to read-only commands.
- You may run `context`, `check`, `scan`, `stale`, and `review-summary`.
- You may run `propose` and `remember` to create proposals.
- Do not run `project-atlas apply`.
- Do not configure `project-atlas apply` as an MCP tool, agent tool, hook, or automatic script.
- If `knowledge/manifest.json` is missing, do not silently initialize the repository. Tell the user and provide the init command.
- In your answer, list the knowledge files used, commands run, and anything that still needs human review.

## First Probe

Run from the repository root:

```bash
command -v project-atlas
project-atlas --help
test -f knowledge/manifest.json && echo "project-atlas: initialized" || echo "project-atlas: missing manifest"
```

If the command is missing:

```bash
npm install -g project-atlas
```

If the repository is not initialized, ask the user before running:

```bash
project-atlas init --repo "$PWD" --template generic-service
```

Use `java-backend` for Java backend repositories:

```bash
project-atlas init --repo "$PWD" --template java-backend
```

Use `frontend-app` for frontend repositories:

```bash
project-atlas init --repo "$PWD" --template frontend-app
```

## Read Context

Read context by task keywords:

```bash
project-atlas context --repo "$PWD" --query "<task keywords>" --budget 8000 --format json
```

If the user mentions a specific file, look up knowledge by source file:

```bash
project-atlas context --repo "$PWD" --source-file "<repo-relative-file>" --format json
```

If the task depends on project memory metadata, filter by memory fields:

```bash
project-atlas context --repo "$PWD" --memory-type decision --topic "<topic>" --scope "<scope>" --format json
```

Inspect these fields:

- `items[].source_path`
- `items[].source_type`
- `items[].metadata`
- `truncated`
- `budget_used`

If `truncated` is `true`, narrow the query or raise `--budget`, then read context again.

## Health Check

Before creating a proposal, handing off work, or preparing a release, run:

```bash
project-atlas check --repo "$PWD" --format json
```

If the result reports missing sources, stale sources, missing metadata, bad links, or duplicate topics, state the risk in your answer. Do not treat unhealthy knowledge as fully trusted.

## Create A Knowledge Proposal

When the task produces durable project knowledge, prepare `updates.json`:

```json
{
  "source_files": ["README.md"],
  "updates": [
    {
      "target": "knowledge/project/overview.md",
      "content": "# Project Overview\n\nWrite verified project knowledge here.\n"
    }
  ]
}
```

Create the proposal:

```bash
project-atlas propose --repo "$PWD" --updates-file updates.json --reason "<why this knowledge changed>"
```

If the target file already has source metadata and the user explicitly wants to inherit it, run:

```bash
project-atlas propose --repo "$PWD" --updates-file updates.json --reason "<why this knowledge changed>" --inherit-source-metadata
```

## Create A Project Memory Proposal

When the task produces a durable decision, experience, or project fact, prepare `memory.json`:

```json
{
  "schema_version": "1.0",
  "source_files": ["docs/development-log/example.md"],
  "memories": [
    {
      "target": "knowledge/decisions/example.md",
      "memory_type": "decision",
      "topic": "example decision",
      "scope": "backend",
      "confidence": 0.9,
      "summary": "Short stable memory summary.",
      "body": "Detailed memory body with source evidence."
    }
  ]
}
```

Create the memory proposal:

```bash
project-atlas remember --repo "$PWD" --candidate-file memory.json --reason "<why this memory matters>"
```

Allowed memory types:

- `decision`
- `experience`
- `project_fact`

## Review Summary

After creating a proposal, read the summary:

```bash
project-atlas review-summary --repo "$PWD"
```

Report at least:

- proposal id
- target files
- source files
- dry-run summary
- review decision
- apply safety
- whether human terminal apply is still required

## MCP

When connected through `project-atlas-mcp`, use only these safe tools:

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

There is no apply tool. If an MCP tool creates a proposal, tell the user to review it and apply it manually in a terminal.

## MCP Client Config

Claude Code:

```bash
claude mcp add --transport stdio project-atlas -- project-atlas-mcp
```

Cursor project config `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "project-atlas": {
      "type": "stdio",
      "command": "project-atlas-mcp",
      "args": []
    }
  }
}
```

Continue config:

```yaml
mcpServers:
  - name: project-atlas
    command: project-atlas-mcp
    args: []
```

## Safety Boundary

- never let the model call `project-atlas apply`
- never bypass proposals and write `knowledge/**` directly
- never treat chat logs as project memory source data
- never treat unhealthy knowledge as final truth

## Response Template

```text
Project Atlas:
- commands run:
- knowledge files used:
- stale or health issues:
- proposal id, if created:
- apply status: human terminal apply required or not needed

Task answer:
- ...
```
