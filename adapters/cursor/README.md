# Cursor Adapter

Cursor can load `project-atlas-mcp` through project or global MCP config.

For project-scoped use, create `.cursor/mcp.json` in the target repository:

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

Use the MCP tool list in Cursor to confirm these tools are available:

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

The adapter only exposes read and proposal evidence actions. A human must do terminal apply after checking the review summary.
