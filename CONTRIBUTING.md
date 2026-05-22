# Contributing

Thanks for helping improve Project Atlas.

Project Atlas is a Git-first project knowledge base CLI for AI coding agents and engineering teams. Its core boundary is simple: agents may read context and create proposals, but only a human should run `project-atlas apply` in a terminal.

## Local Setup

```bash
npm install
npm run build
```

## Checks

Run these checks before opening a pull request:

```bash
npm run lint:types
npm test
npm run verify
npm pack --dry-run
node dist/index.js --help
node dist/mcp.js --help
```

## Pull Request Rules

- Keep changes small and focused.
- Add or update tests for CLI behavior, schema behavior, adapters, and safety boundaries.
- Update `docs/development-log/` for notable implementation work.
- Do not add a model-callable apply tool.
- Do not make `project-atlas apply` run without human terminal confirmation.
- Do not commit `.project-atlas/`, `.code-review-graph/`, `node_modules/`, or local credentials.

## Documentation

Human-facing documentation may be bilingual. Agent-facing documentation should be plain English so it can be reused across tools and teams.

Important entry points:

- `README.md`
- `docs/site/README.md`
- `docs/site/agent-quickstart.md`
- `docs/site/en/README.md`

## Release

Project maintainers publish manually:

```bash
npm run verify
npm pack --dry-run
npm publish
git tag v<version>
git push origin main --tags
```
