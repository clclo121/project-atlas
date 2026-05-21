# project-kb-core

`project-kb-core` is a Git-first project knowledge base governance CLI for AI coding agents and human reviewers.

The CLI name is `project-kb`. It keeps long-lived project knowledge in `knowledge/`, keeps local proposal evidence in `.project-kb/proposals/`, and requires human TTY confirmation before writing generated knowledge files.

## What It Solves

- Reduces repeated project rereading by producing compact context packs.
- Helps AI sessions carry project context through `knowledge/` files.
- Makes generated knowledge reviewable through source files, hashes, proposals, and trigger evidence.
- Blocks direct model writes by keeping `apply` as an interactive terminal-only command.
- Helps human reviewers inspect changes through `review-summary`.

## Commands

```bash
npm install
npm run build

node dist/index.js init --repo /path/to/repo
node dist/index.js scan --repo /path/to/repo --mode full
node dist/index.js context --repo /path/to/repo --query order --budget 8000
node dist/index.js stale --repo /path/to/repo
node dist/index.js propose --repo /path/to/repo --updates-file updates.json --reason "update project knowledge"
node dist/index.js review-summary --repo /path/to/repo
node dist/index.js apply --repo /path/to/repo --proposal-id <id> --confirm
```

When installed as a package, use `project-kb` instead of `node dist/index.js`.

## Knowledge Layout

`project-kb init` creates:

- `knowledge/project/overview.md`
- `knowledge/domains/`
- `knowledge/workflows/`
- `knowledge/contracts/`
- `knowledge/integrations/`
- `knowledge/quality/`
- `knowledge/decisions/`

Generated knowledge documents use YAML frontmatter with `source_files`, `source_hashes`, `generated_by`, and `review_status`.

## JSON Schemas

The package ships JSON Schema draft 2020-12 files under `schema/`:

- `schema/manifest.schema.json`
- `schema/proposal.schema.json`
- `schema/trigger-result.schema.json`
- `schema/context-pack.schema.json`

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

## Release Check

Before publishing, run:

```bash
npm run lint:types
npm test
npm pack --dry-run
node dist/index.js --help
node dist/index.js context --help
```

The package should include `README.md`, `LICENSE`, `CHANGELOG.md`, `dist/`, `adapters/`, `schema/`, and `package.json`.

## First Version Boundaries

- Git repositories only.
- No Web UI.
- No MCP server.
- No built-in semantic search or code graph.
- No model-callable apply tool.
- OpenCode support is an adapter example, not the core product.
