# Quick Start

Start with the shortest CLI flow. OpenCode users should go straight to the dedicated guide.

[English](quick-start.md) | [简体中文](../quick-start.md)

This page is for first-time Project Atlas users. It keeps the shortest CLI path only. It no longer carries the full OpenCode tutorial.

If you are using Project Atlas inside OpenCode, read the [OpenCode guide](../../adapters/opencode/README.md).

If you are integrating another AI agent or MCP client, read [Agent Quickstart](agent-quickstart.md) first.

---

## Shortest CLI Flow

After this page, you will:

1. initialize `knowledge/`
2. read governed project context
3. create a knowledge proposal
4. review the proposal summary
5. understand why `apply` stays manual

### 1. Run It From This Repository

Install dependencies and build:

```bash
npm install
npm run build
```

Run the shortest local flow with the built files:

```bash
PROJECT_ATLAS_REPO="$PWD"
DEMO_REPO=/tmp/project-atlas-demo
mkdir -p "$DEMO_REPO"
cd "$DEMO_REPO"
git init
printf '# Demo Project\n\nThis repo demonstrates project-atlas.\n' > README.md
cat > updates.json <<'JSON'
{
  "source_files": ["README.md"],
  "updates": [
    {
      "target": "knowledge/project/overview.md",
      "content": "# Project Overview\n\nThis demo repository is used to verify Project Atlas.\n"
    }
  ]
}
JSON
node "$PROJECT_ATLAS_REPO/dist/index.js" init --repo "$DEMO_REPO" --template generic-service
node "$PROJECT_ATLAS_REPO/dist/index.js" context --repo "$DEMO_REPO" --query demo --budget 8000 --format json
node "$PROJECT_ATLAS_REPO/dist/index.js" propose --repo "$DEMO_REPO" --updates-file updates.json --reason "demo update"
node "$PROJECT_ATLAS_REPO/dist/index.js" review-summary --repo "$DEMO_REPO"
node "$PROJECT_ATLAS_REPO/dist/index.js" check --repo "$DEMO_REPO" --format json
```

### 2. Use The npm Package

Once the package is published, or if it is already installed locally:

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

The shortest command flow is:

```bash
project-atlas init --repo /path/to/repo --template generic-service
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
project-atlas review-summary --repo /path/to/repo
```

Initialization creates:

- `knowledge/`
- `knowledge/project/overview.md`
- `knowledge/manifest.json`
- `.project-atlas/proposals/`

When you prepare `updates.json`, the minimum shape looks like this:

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

The review summary helps you see the proposal id, source files, target files, dry-run summary, review decision, and apply safety.

## Manual Apply Boundary

Real writes still require a human terminal action:

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

Project Atlas allows agents to read context and create proposals. It does not allow agents to apply knowledge changes directly.

## Where To Go Next

- If you are using OpenCode
  Read the [OpenCode guide](../../adapters/opencode/README.md)
- If you are integrating another AI agent
  Read [Agent Quickstart](agent-quickstart.md)
- If you want guidance on what knowledge to keep
  Read [Best Practices](best-practices.md)
- If you want to publish this repository
  Read [Publish Now](publish-now.md)
