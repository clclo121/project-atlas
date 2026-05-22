# Release Process

This page describes the long-term release policy for Project Atlas. It is about release governance, not the one-time step list for the current repository.

If you are publishing this repository right now, go to [Publish Now](publish-now.md).

## Versioning Rules

Project Atlas uses SemVer:

- `MAJOR`
  incompatible CLI, schema, or evidence format changes
- `MINOR`
  new commands, flags, schema fields, or adapter capabilities
- `PATCH`
  bug fixes, documentation corrections, and maintenance with no behavior change

The current public schema version is `1.0`. Documentation-only clarification does not require a schema version bump. Incompatible field changes do require a schema version update and a clear migration note in the changelog.

## What Must Be Updated Before A Release

Before each release, confirm:

- the version in `package.json`
- `CHANGELOG.md`
- command names and safety boundaries in the docs
- entry links in `README.md` and `docs/site/`

If the release changes CLI behavior, schema structure, MCP tool scope, or safety boundaries, call that out explicitly in the changelog.

## Fixed Verification Before Release

Run these checks before every release:

```bash
npm run lint:types
npm test
npm run verify
npm pack --dry-run
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

`npm pack --dry-run` should include:

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `dist/`
- `adapters/`
- `schema/`
- `templates/`
- `docs/site/`
- `package.json`

It should usually not include:

- `test/`
- `src/`
- `docs/development-log/`
- `node_modules/`

## Release Steps

The recommended order is:

1. update the version and `CHANGELOG.md`
2. create and push the release commit
3. run `npm run release:verify`
4. run `npm run release:npm`

If the script is unavailable, fall back to the manual command flow.

## Post-Release Checks

After publishing, confirm:

- `npm view project-atlas version`
- `npm view project-atlas dist-tags`
- `npm install -g project-atlas`
- `project-atlas --help`
- `project-atlas-mcp --help`

## Keep Docs In Sync

Whenever a release changes the first-use experience, verify these pages together:

- root `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`
- `docs/site/quick-start.md`
- `docs/site/en/quick-start.md`
- `docs/site/agent-quickstart.md`
- `docs/site/en/agent-quickstart.md`

A Project Atlas release is not only a code release. It is also a release of the product story and the safety boundary.
