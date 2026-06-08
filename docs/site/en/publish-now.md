# Publish Now

If you need to publish today, start here.

[English](publish-now.md) | [简体中文](../publish-now.md)

This page answers one question. If this repository needs to be published to npm today, what is the order of operations.

For the longer-term policy, read [Release Process](release-process.md).

---

## Current Facts

- package name: `project-atlas`
- current version: `0.1.4`
- current release flow: manual publish
- no GitHub Release flow is used right now
- the local main branch should be synchronized with the remote before publishing
- `README.md` and `docs/site/` are part of the npm package and must be checked before release

---

## Check Repository State First

```bash
git status --branch --short
git remote -v
```

If the local main branch is ahead of the remote, push first:

```bash
git push origin main
```

---

## Pre-Publish Checklist

Make sure these files reflect the current release:

- `package.json`
- `CHANGELOG.md`
- `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`

Prefer the scripted verification entry first:

```bash
npm run release:verify
```

If the script is unavailable, run the fixed verification commands:

```bash
npm run verify
npm run pack:dry-run
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/index.js apply --help
node dist/mcp.js --help
```

---

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

---

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

---

## Publish

Once the working tree is clean and verification has passed, run:

```bash
npm run release:npm
```

If the npm account uses 2FA, pass the one-time password in the same command:

```bash
npm run release:npm -- --otp=123456
```

This script automates these steps:

- verify a clean working tree
- verify that `package.json` is ahead of the npm registry version
- verify that `CHANGELOG.md` contains the current version section
- run the release verification commands
- push `main` when needed
- run `npm publish`
- run post-publish checks
- create and push the release tag

If the script already reached `npm publish` and failed with `EOTP`, you do not need to split the flow manually. Re-run the same command with `--otp` and let the script repeat verification and finish the publish flow.

If you only want to run checks without publishing, use:

```bash
npm run release:verify
```

If you later need staged releases, extend the script flags. This script currently covers the default production publish flow.

---

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

---

## Create And Push The Tag

If the publish succeeded, create the version tag:

```bash
git tag v0.1.4
git push origin tag v0.1.4
```

If the release version is not `0.1.4`, replace the tag with the real version.

---

## What To Check First If It Fails

Use this review order:

1. whether `npm whoami` shows the expected account
2. whether `npm pack --dry-run` is missing docs or build output
3. whether `npm test` and `npm run verify` actually passed
4. whether links in `README.md` and `docs/site/` are still correct
5. whether the version and repository metadata in `package.json` are correct
