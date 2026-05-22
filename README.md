# Project Atlas

Stop re-reading the whole repo. Start shipping with governed project knowledge.

[English](docs/site/en/README.md) | [简体中文](docs/site/README.md)

Project Atlas is a Git-first project knowledge base CLI for engineering teams and AI coding agents. It keeps durable knowledge under `knowledge/`, turns updates into reviewable proposals, and requires a human terminal confirmation before any real write.

AI tools often re-read too much source, miss stable project facts, and leave teams with chat-only context. Project Atlas fixes that with governed repository knowledge, proposal-based updates, and a strict manual apply boundary.

---

## Quick Start

Try the repository build:

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

One short flow gets you from repository setup to governed context and reviewable knowledge updates.

---

## Why Project Atlas

Project Atlas is built for teams that want AI agents to reuse trusted project context instead of re-reading the entire repository on every task.

It helps teams:

- store stable project knowledge in Git
- keep knowledge tied to source files and hashes
- review knowledge changes before they land
- keep agent access read-oriented by default
- capture durable project memory without turning chat logs into source of truth

---

## How It Works

- npm package: `project-atlas`
- CLI command: `project-atlas`
- Local stdio MCP server: `project-atlas-mcp`
- Shared project knowledge directory: `knowledge/`
- Local proposal evidence directory: `.project-atlas/proposals/`

The common sequence is simple:

1. run `init` to create the knowledge base skeleton
2. run `context` to read governed project context
3. run `propose` or `remember` to create reviewable updates
4. run `review-summary` before approval
5. let a human run `apply` in a terminal

Project Atlas is not a hosted service and not a write-enabled agent plugin. It is a repository-native governance layer for project knowledge.

---

## Core Safety Boundary

Agents may read context, inspect knowledge health, and create proposals.

Agents must not apply proposals.

Real writes still require a human terminal confirmation:

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

The MCP server exposes safe tools only. There is no MCP apply tool.

---

## Documentation

Choose a starting path:

- Try it now: [English Quick Start](docs/site/en/quick-start.md) or [中文快速开始](docs/site/quick-start.md)
- Use it in OpenCode: [English OpenCode guide](adapters/opencode/README.md) or [中文 OpenCode 使用文档](adapters/opencode/README.zh-CN.md)
- Integrate an agent: [English Agent Quickstart](docs/site/en/agent-quickstart.md) or [中文 Agent 快速接入](docs/site/agent-quickstart.md)
- Publish this repo: [English release notes](docs/site/en/publish-now.md) or [中文发布指南](docs/site/publish-now.md)

Full documentation indexes:

- English: [docs/site/en/README.md](docs/site/en/README.md)
- 中文: [docs/site/README.md](docs/site/README.md)

---

## Adapters And MCP

Project Atlas ships a local stdio MCP server and example adapters for agent tooling.

- MCP server command: `project-atlas-mcp`
- Example adapters: `adapters/claude-code/`, `adapters/cursor/`, `adapters/continue/`, `adapters/opencode/`

Use adapters for safe read and proposal workflows. Keep final apply in a human terminal session.

---

## Contributing And Security

- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
