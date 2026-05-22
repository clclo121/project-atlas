# Claude Code Adapter

Claude Code can connect to `project-atlas-mcp` as a local stdio MCP server.

Install `project-atlas` first, then add the server from a project directory:

```bash
claude mcp add --transport stdio project-atlas -- project-atlas-mcp
```

For a team-shared project config, create `.mcp.json`:

```json
{
  "mcpServers": {
    "project-atlas": {
      "type": "stdio",
      "command": "project-atlas-mcp",
      "args": []
    }
  }
}
```

Available tools are scan, context, stale, propose, remember, check, and review summary.

No model-callable write tool is provided. A human must do terminal apply after reviewing proposal evidence.
