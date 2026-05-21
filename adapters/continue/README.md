# Continue Adapter

Continue can use `project-kb-mcp` through its MCP context provider support.

Add this to `config.yaml`:

```yaml
mcpServers:
  - name: project-kb
    command: project-kb-mcp
    args: []
```

After reloading Continue, choose the MCP context provider and call the safe project-kb tools for scan, context, stale checks, proposals, and review summary.

The adapter does not provide a direct write tool. A human must do terminal apply after proposal review.
