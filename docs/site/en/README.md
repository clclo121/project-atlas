# Project Atlas Documentation

Project Atlas is a Git-first project knowledge base CLI for engineering teams and AI coding agents.

The npm package is `project-atlas`. The CLI command is `project-atlas`. The local stdio MCP server is `project-atlas-mcp`.

## Start Here

If you are an AI agent, read [Agent Quickstart](agent-quickstart.md) first. It is written as an execution protocol, not as a long tutorial.

If you are setting up the tool manually, read [Quick Start](quick-start.md).

Chinese documentation is available at [../README.md](../README.md).

## Core Boundary

Project Atlas stores shared project knowledge under `knowledge/` and local proposal evidence under `.project-atlas/proposals/`.

Agents may read context and create proposals. Agents must not apply proposals. Real writes still require a human terminal confirmation through:

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

## Common Commands

```bash
project-atlas init --repo /path/to/repo --template generic-service
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
project-atlas check --repo /path/to/repo --format json
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh knowledge"
project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason "capture project memory"
project-atlas review-summary --repo /path/to/repo
project-atlas-mcp --help
```

## MCP Tools

The MCP server exposes only safe tools:

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

No MCP apply tool exists.
