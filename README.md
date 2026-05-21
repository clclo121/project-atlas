# project-kb-core

`project-kb-core` is a Git-first project knowledge base governance CLI for AI coding agents and human reviewers.

The CLI name is `project-kb`. The local MCP server name is `project-kb-mcp`. The project keeps long-lived knowledge in `knowledge/`, keeps local proposal evidence in `.project-kb/proposals/`, and requires human TTY confirmation before writing generated knowledge files.

## What It Solves

- Reduces repeated project rereading by producing compact context packs.
- Helps AI sessions carry project context through `knowledge/` files.
- Makes generated knowledge reviewable through source files, hashes, proposals, and trigger evidence.
- Blocks direct model writes by keeping `apply` as an interactive terminal-only command.
- Helps human reviewers inspect changes through `review-summary`.

## Documentation

Start from [docs/site/README.md](docs/site/README.md). It includes quick start, best practices, team rollout, security FAQ, and release process notes.

## Commands

```bash
npm install
npm run build

node dist/index.js init --repo /path/to/repo --template java-backend
node dist/index.js scan --repo /path/to/repo --mode full --external-evidence-file evidence.json
node dist/index.js context --repo /path/to/repo --query "order payment" --budget 8000
node dist/index.js context --repo /path/to/repo --source-file README.md --format json
node dist/index.js stale --repo /path/to/repo
node dist/index.js propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason "update project knowledge" --inherit-source-metadata
node dist/index.js remember --repo /path/to/repo --candidate-file memory.json --reason "capture project memory"
node dist/index.js check --repo /path/to/repo --format json
node dist/index.js review-summary --repo /path/to/repo
node dist/index.js apply --repo /path/to/repo --proposal-id <id> --confirm
node dist/mcp.js --help
```

When installed as a package, use `project-kb` instead of `node dist/index.js`.
Use `project-kb-mcp` to start the local stdio MCP server.

## Knowledge Layout

`project-kb init` creates:

- `knowledge/project/overview.md`
- `knowledge/domains/`
- `knowledge/workflows/`
- `knowledge/contracts/`
- `knowledge/integrations/`
- `knowledge/quality/`
- `knowledge/decisions/`

Generated knowledge documents use YAML frontmatter with `source_files`, `source_hashes`, `generated_by`, and `review_status`. Project memory documents may also use `memory_type`, `topic`, `scope`, `confidence`, `owner`, and `related_docs`.

`project-kb init` supports lightweight wording templates:

- `generic-service`
- `java-backend`
- `frontend-app`

Templates keep the same `knowledge/` layout. They only change initial prompts and section descriptions. Existing files are not overwritten.

## Context And Review

`project-kb context` supports multiple query keywords. Any keyword may match, and sources are still ordered by active OpenSpec changes, archived OpenSpec specs, then `knowledge/`.

Use `--source-file <path>` to find knowledge documents whose frontmatter references a source file:

```bash
project-kb context --repo /path/to/repo --source-file README.md --format json
```

JSON context packs include `source_type`, `truncated`, and `budget_used`, so agents can tell where content came from and whether the pack was shortened.

Project memory can be filtered by metadata:

```bash
project-kb context --repo /path/to/repo --memory-type decision --topic payment --scope backend --format json
```

`project-kb stale` prints suggested next actions for stale, missing source, and missing metadata cases. `project-kb review-summary` includes dry-run size, review decision, and apply safety sections.

`project-kb check` audits the knowledge base for missing files, missing metadata, stale sources, missing sources, empty documents, broken relative links, duplicated topics, and invalid schema JSON:

```bash
project-kb check --repo /path/to/repo --format json
```

When updating an existing knowledge file, add `--inherit-source-metadata` to merge the old document's `source_files` into the new proposal:

```bash
project-kb propose --repo /path/to/repo --updates-file updates.json --reason "refresh order knowledge" --inherit-source-metadata
```

## Project Memory

Project memory is shared team memory stored in `knowledge/`. It is not a personal long-term memory store and does not read chat history.

Memory candidates are structured JSON. `project-kb remember` validates the file and creates a proposal. It does not write knowledge files directly.

```bash
project-kb remember --repo /path/to/repo --candidate-file memory.json --reason "capture project memory"
```

Example candidate:

```json
{
  "schema_version": "1.0",
  "source_files": ["docs/development-log/2026-05-21-example.md"],
  "memories": [
    {
      "target": "knowledge/decisions/payment-review.md",
      "memory_type": "decision",
      "topic": "payment review",
      "scope": "backend",
      "confidence": 0.9,
      "summary": "Payment review must check duplicate callbacks.",
      "body": "When changing payment callbacks, review duplicate notification handling before changing signature validation.",
      "owner": "platform-team",
      "related_docs": ["knowledge/workflows/payment.md"]
    }
  ]
}
```

Use `decision` for durable decisions, `experience` for lessons from completed work, and `project_fact` for stable project facts.

## External Evidence

`project-kb scan` and `project-kb propose` can import optional external code evidence:

```bash
project-kb scan --repo /path/to/repo --external-evidence-file evidence.json
project-kb propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason "refresh knowledge"
```

The file shape is:

```json
{
  "schema_version": "1.0",
  "external_evidence": [
    {
      "source": "aider-repo-map",
      "source_type": "repo_map",
      "path": "src/main/java/com/example/OrderService.java",
      "symbol": "OrderService",
      "summary": "Order service owns order planning rules.",
      "locator": "src/main/java/com/example/OrderService.java#L12",
      "confidence": 0.86
    }
  ]
}
```

External tools are optional. Without this file, `external_evidence` is an empty array. When present, proposal evidence and `review-summary` cite the source.

## JSON Schemas

The package ships JSON Schema draft 2020-12 files under `schema/`:

- `schema/manifest.schema.json`
- `schema/proposal.schema.json`
- `schema/trigger-result.schema.json`
- `schema/context-pack.schema.json`
- `schema/external-evidence.schema.json`
- `schema/memory-candidate.schema.json`

The first public schema version is `1.0`. Patch releases may clarify descriptions without changing field meaning. Any incompatible field change must use a new schema version and a documented changelog entry.

## OpenCode Adapter

The OpenCode adapter is an example integration. It exposes scan, context, and propose tools only. It does not expose apply.

Install `project-kb` first, then copy `adapters/opencode/tools`, `adapters/opencode/commands`, and `adapters/opencode/skills` into the matching OpenCode asset location used by your team. After that, verify three calls in a temporary Git project:

```bash
project-kb init --repo /tmp/project-kb-demo
project-kb scan --repo /tmp/project-kb-demo --mode full
project-kb context --repo /tmp/project-kb-demo --query demo
project-kb propose --repo /tmp/project-kb-demo --updates-file updates.json --reason "demo update"
```

The proposal output must tell the user to run `project-kb apply` manually in a terminal.

## MCP And Agent Adapters

`project-kb-mcp` starts a local stdio MCP server. It exposes only:

- `project_kb_scan`
- `project_kb_context`
- `project_kb_stale`
- `project_kb_propose`
- `project_kb_remember`
- `project_kb_check`
- `project_kb_review_summary`

It does not expose an apply tool. Generated proposals must still be reviewed, and a human must run terminal apply.

Claude Code:

```bash
claude mcp add --transport stdio project-kb -- project-kb-mcp
```

Cursor project config:

```json
{
  "mcpServers": {
    "project-kb": {
      "type": "stdio",
      "command": "project-kb-mcp",
      "args": []
    }
  }
}
```

Continue config:

```yaml
mcpServers:
  - name: project-kb
    command: project-kb-mcp
    args: []
```

More details are in `adapters/claude-code/`, `adapters/cursor/`, and `adapters/continue/`.

## Release Check

Before publishing, run:

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

`npm run verify` runs type check and tests. The test command builds before running the test suite. `npm run pack:dry-run` is a shorter alias for package content checks.

The package should include `README.md`, `LICENSE`, `CHANGELOG.md`, `dist/`, `adapters/`, `schema/`, `templates/`, `docs/site/`, and `package.json`.

## First Version Boundaries

- Git repositories only.
- No Web UI.
- Local stdio MCP server only. No remote HTTP MCP server.
- No built-in semantic search or code graph.
- No model-callable apply tool.
- No personal long-term memory store.
- OpenCode, Claude Code, Cursor, and Continue support are adapter examples, not the core product.
