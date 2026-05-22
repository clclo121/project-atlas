# OpenCode Adapter Example

This adapter shows how OpenCode can call `project-atlas` without making OpenCode the core product.

## Install

1. Install and build `project-atlas`.

```bash
npm install
npm run build
npm link
```

2. Copy this folder into the matching OpenCode assets location used by your team.

```text
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

3. Restart OpenCode so it reloads the tools, commands, and skill.

The tools only call read, scan, and proposal commands. There is no apply tool. Real writes must be done by a human in a terminal:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```

## Manual Smoke Test

- Run `project_atlas_scan` in a temporary Git project and confirm it returns scan JSON.
- Run `project_atlas_context` with a small query and confirm it returns source paths.
- Run `project_atlas_propose` with one target under `knowledge/` and confirm it creates proposal evidence.
- Confirm no `project_atlas_apply` tool exists.
- Confirm the proposal output tells the user to run `project-atlas apply` in a terminal.
