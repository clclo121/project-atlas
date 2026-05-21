# Cursor Adapter

Cursor can load `project-kb-mcp` through project or global MCP config.

For project-scoped use, create `.cursor/mcp.json` in the target repository:

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

Use the MCP tool list in Cursor to confirm these tools are available:

- `project_kb_scan`
- `project_kb_context`
- `project_kb_stale`
- `project_kb_propose`
- `project_kb_remember`
- `project_kb_check`
- `project_kb_review_summary`

The adapter only exposes read and proposal evidence actions. A human must do terminal apply after checking the review summary.
