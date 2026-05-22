# Quick Start

This page is the shortest manual path for trying Project Atlas.

## Install Or Build

From this repository:

```bash
npm install
npm run build
```

After npm publish, users can install:

```bash
npm install -g project-atlas
project-atlas --help
```

## Initialize A Repository

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

Available templates:

- `generic-service`
- `java-backend`
- `frontend-app`

## Read Context

```bash
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
```

Lookup knowledge by source file:

```bash
project-atlas context --repo /path/to/repo --source-file README.md --format json
```

## Create A Proposal

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

Run:

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
```

## Review And Apply

```bash
project-atlas review-summary --repo /path/to/repo
```

Only a human should apply:

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

Agents must not run apply.
