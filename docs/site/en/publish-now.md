# Publish Now

This page answers one question. If this repository needs to be published to npm today, what is the order of operations.

For the longer-term policy, read [Release Process](release-process.md).

## Current Facts

- package name: `project-atlas`
- current version: `0.1.0`
- current release flow: manual publish
- no GitHub Release flow is used right now
- the local main branch should be synchronized with the remote before publishing
- `README.md` and `docs/site/` are part of the npm package and must be checked before release

## Check Repository State First

```bash
git status --branch --short
git remote -v
```

If the local main branch is ahead of the remote, push first:

```bash
git push origin main
```

## Pre-Publish Checklist

Make sure these files reflect the current release:

- `package.json`
- `CHANGELOG.md`
- `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`

Then run the fixed verification commands:

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

## Inspect The Package Contents

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

## Log In To npm

Confirm the active registry:

```bash
npm config get registry
```

Confirm the authenticated account:

```bash
npm login
npm whoami
```

## Publish

Once the working tree is clean and verification has passed, run:

```bash
npm publish
```

If you later need staged releases, add `--tag`. This page covers the default production publish flow only.

## Post-Publish Checks

After publishing, check:

```bash
npm view project-atlas version
npm view project-atlas dist-tags
```

Then verify installation:

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

## Create And Push The Tag

If the publish succeeded, create the version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

If the release version is not `0.1.0`, replace the tag with the real version.

## What To Check First If It Fails

Use this review order:

1. whether `npm whoami` shows the expected account
2. whether `npm pack --dry-run` is missing docs or build output
3. whether `npm test` and `npm run verify` actually passed
4. whether links in `README.md` and `docs/site/` are still correct
5. whether the version and repository metadata in `package.json` are correct
