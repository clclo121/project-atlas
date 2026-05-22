# Agent Quickstart

Set the safety boundary first, then connect the agent. OpenCode users should go straight to the dedicated guide.

[English](agent-quickstart.md) | [简体中文](../agent-quickstart.md)

This document is for general agent and MCP client integrations. It keeps the shared safety rules only. It no longer carries the full OpenCode walkthrough.

If you are using Project Atlas inside OpenCode, read the [OpenCode guide](../../adapters/opencode/README.md).

If you are a human user who wants the shortest CLI path first, read [Quick Start](quick-start.md).

---

## Shared Rules

- Read Project Atlas context before broad source exploration
- Default to read-only commands
- You may run `context`, `check`, `scan`, `stale`, and `review-summary`
- You may run `propose` and `remember` to create proposals
- Do not run `project-atlas apply`
- Do not configure `project-atlas apply` as an MCP tool, agent tool, hook, or automatic script
- If `knowledge/manifest.json` is missing, do not silently initialize the repository
- In your answer, list the knowledge files used, commands run, and anything that still needs human review

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

## Health Check

Before creating a proposal, handing off work, or preparing a release, run:

```bash
project-atlas check --repo "$PWD" --format json
```

If the result reports missing sources, stale sources, missing metadata, bad links, or duplicate topics, state the risk in your answer.

## Proposals And Memory

General agent integrations only need to keep two rules straight:

- use `project-atlas propose` for stable project knowledge
- use `project-atlas remember` for stable decisions, experience, and project facts

If you are doing this inside OpenCode, the full user tutorial is in the [OpenCode guide](../../adapters/opencode/README.md).

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
