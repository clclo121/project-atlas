# Claude Code Adapter

Claude Code can connect to `project-kb-mcp` as a local stdio MCP server.

Install `project-kb-core` first, then add the server from a project directory:

```bash
claude mcp add --transport stdio project-kb -- project-kb-mcp
```

For a team-shared project config, create `.mcp.json`:

```json
{
  "mcpServers": {
    "project-kb": {
      "type": "stdio",
      "command": "project-kb-mcp",
      "args": []
    }
  }
}
```

Available tools are scan, context, stale, propose, remember, check, and review summary.

No model-callable write tool is provided. A human must do terminal apply after reviewing proposal evidence.
