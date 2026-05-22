# Project Atlas Documentation

Read less source. Reuse more trusted project knowledge.

[English](README.md) | [简体中文](../README.md)

Project Atlas is a Git-first project knowledge base CLI for open source maintainers, engineering teams, and AI coding agents. It stores durable project knowledge under `knowledge/`, turns knowledge updates into reviewable proposals, and keeps final writes behind a human terminal confirmation.

AI tools often re-read too much source, miss stable project facts, and leave teams with chat-only context. Project Atlas brings that knowledge back into the repository with governed docs, reviewable proposal flows, and a strict manual apply boundary.

---

## Quick Start

Try the shortest local flow:

```bash
npm install
npm run build
node dist/index.js init --repo /tmp/project-atlas-demo --template generic-service
node dist/index.js context --repo /tmp/project-atlas-demo --query demo --budget 8000 --format json
node dist/index.js propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-atlas-demo
```

After npm publish, install the package and use the stable commands:

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

This gets you from repository setup to governed context and reviewable knowledge updates in one short pass.

---

## Why Project Atlas

Project Atlas is useful when you want to:

- give AI agents trusted project context before broad source exploration
- keep stable project knowledge in Git instead of scattered chat history
- review knowledge changes with source evidence and hashes
- capture durable project memory without allowing automatic writes

Its core boundary stays simple:

- agents may read context and create proposals
- agents must not run `project-atlas apply`
- real writes still require a human terminal confirmation

---

## How It Works

The most common sequence is:

1. run `init` to create the knowledge base skeleton
2. run `context` to read governed project context
3. run `propose` or `remember` to create reviewable updates
4. run `review-summary` before approval
5. let a human run `apply` in a terminal

---

## Start With One Path

Choose the shortest route for your goal:

- Try it now
  Read [Quick Start](quick-start.md)
- Integrate an agent
  Read [Agent Quickstart](agent-quickstart.md)
- Publish this repo
  Read [Publish Now](publish-now.md)

---

## Documentation Map

- [Quick Start](quick-start.md)
  The shortest path for a first successful run
- [Agent Quickstart](agent-quickstart.md)
  The execution protocol for agent and MCP usage
- [Best Practices](best-practices.md)
  What knowledge to keep, what to leave out, and how to keep it trustworthy
- [Team Rollout](team-rollout.md)
  A practical order for introducing Project Atlas to a team
- [Security FAQ](security-faq.md)
  Why apply is manual and how sensitive evidence is handled
- [Release Process](release-process.md)
  The long-term release policy for this package
- [Publish Now](publish-now.md)
  The current repository-specific release checklist

If you want commands first, start with [Quick Start](quick-start.md).
