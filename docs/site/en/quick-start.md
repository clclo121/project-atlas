# Quick Start

Get Project Atlas running in 10 minutes.

[English](quick-start.md) | [简体中文](../quick-start.md)

This page is for first-time users who want one short path from repository setup to governed context and a reviewable proposal.

If you are integrating an AI agent, read [Agent Quickstart](agent-quickstart.md) first.

---

## What You Will Finish

By the end of this page, you will:

1. initialize `knowledge/`
2. read governed project context
3. create a knowledge proposal
4. review the proposal summary
5. understand why `apply` stays manual

---

## Option 1: Try It From This Repository

Install dependencies and build:

```bash
npm install
npm run build
```

Run the shortest local flow with the built files:

```bash
node dist/index.js init --repo /tmp/project-atlas-demo --template generic-service
node dist/index.js context --repo /tmp/project-atlas-demo --query demo --budget 8000 --format json
node dist/index.js propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-atlas-demo
node dist/index.js check --repo /tmp/project-atlas-demo --format json
```

---

## Option 2: Use The npm Package

Once the package is published, or if it is already installed locally:

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

Initialize a repository:

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

Available templates:

- `generic-service`
- `java-backend`
- `frontend-app`

---

## The Shortest Successful Flow

### 1. Initialize The Knowledge Base

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

This creates:

- `knowledge/`
- `knowledge/project/overview.md`
- `knowledge/manifest.json`
- `.project-atlas/proposals/`

### 2. Read Context

Read compact context by task keywords:

```bash
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
```

If you already know a source file, look up knowledge by source file:

```bash
project-atlas context --repo /path/to/repo --source-file README.md --format json
```

### 3. Create A Knowledge Proposal

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
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
```

### 4. Read The Review Summary

```bash
project-atlas review-summary --repo /path/to/repo
```

This is the fastest way to inspect:

- proposal id
- source files
- target files
- dry-run summary
- review decision
- apply safety

---

## The Most Important Boundary

### Keep Apply Manual

Real writes still require a human terminal action:

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

Project Atlas allows agents to read context and create proposals. It does not allow agents to apply knowledge changes directly.

---

## What To Read Next

- Want to integrate an AI agent
  Read [Agent Quickstart](agent-quickstart.md)
- Want guidance on what knowledge to keep
  Read [Best Practices](best-practices.md)
- Want to publish this repository
  Read [Publish Now](publish-now.md)
