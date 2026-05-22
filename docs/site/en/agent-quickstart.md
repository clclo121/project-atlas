# Agent Quickstart

This document is for AI coding agents. The goal is to read governed project knowledge in the first 60 seconds of a task, check whether the knowledge base is healthy, and create reviewable proposals when knowledge should change.

## Rules

- Read Project Atlas before broad source exploration.
- Default to read-only commands.
- You may run `context`, `check`, `scan`, `stale`, and `review-summary`.
- You may run `propose` and `remember` to create proposals.
- Do not run `project-atlas apply`.
- Do not configure `project-atlas apply` as an MCP tool, agent tool, or automatic script.
- If `knowledge/manifest.json` is missing, do not silently initialize the repo. Tell the user and provide the init command.
- When answering, list the knowledge files used, commands run, and any issue that still needs human review.

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

If the repo is not initialized, ask the user before running:

```bash
project-atlas init --repo "$PWD" --template generic-service
```

Use `java-backend` for Java backend repos and `frontend-app` for frontend repos.

## Read Context

Use task keywords:

```bash
project-atlas context --repo "$PWD" --query "<task keywords>" --budget 8000 --format json
```

If a file is mentioned:

```bash
project-atlas context --repo "$PWD" --source-file "<repo-relative-file>" --format json
```

If project memory metadata matters:

```bash
project-atlas context --repo "$PWD" --memory-type decision --topic "<topic>" --scope "<scope>" --format json
```

Check `items[].source_path`, `items[].source_type`, `items[].metadata`, `truncated`, and `budget_used`.

## Health Check

Before proposing knowledge changes or handing off work:

```bash
project-atlas check --repo "$PWD" --format json
```

Report missing sources, stale sources, missing metadata, bad links, and duplicate topics. Do not treat unhealthy knowledge as fully trusted.

## Create A Knowledge Proposal

Prepare `updates.json`:

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

## Create A Project Memory Proposal

Prepare `memory.json`:

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

Run:

```bash
project-atlas remember --repo "$PWD" --candidate-file memory.json --reason "<why this memory matters>"
```

Allowed memory types are `decision`, `experience`, and `project_fact`.

## Review Summary

After creating a proposal:

```bash
project-atlas review-summary --repo "$PWD"
```

Report the proposal id, target files, source files, dry-run summary, review decision, apply safety, and whether human apply is needed.

## MCP

Use only these MCP tools:

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

There is no apply tool.

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

## Agent Response Template

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
