# Continue Adapter

Continue can use `project-atlas-mcp` through its MCP context provider support.

Add this to `config.yaml`:

```yaml
mcpServers:
  - name: project-atlas
    command: project-atlas-mcp
    args: []
```

After reloading Continue, choose the MCP context provider and call the safe project-atlas tools for scan, context, stale checks, proposals, project memory proposals, health checks, and review summary.

The adapter does not provide a direct write tool. A human must do terminal apply after proposal review.
