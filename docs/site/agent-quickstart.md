# Project Atlas Agent 快速接入

先定安全边界，再接 agent。OpenCode 用户请直接看专属文档。

[English](en/agent-quickstart.md) | [简体中文](agent-quickstart.md)

这份文档给通用 agent 和 MCP 客户端接入方使用。它只保留通用接入规则，不再承载完整 OpenCode 使用教程。

如果你在 OpenCode 里使用 Project Atlas，直接看 [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)。

如果你只是想先跑一遍 CLI 命令，先看 [快速开始](quick-start.md)。

---

## 通用接入规则

- 大范围搜索源码之前，先读取 Project Atlas 上下文
- 默认优先只读命令
- 可以运行 `context`、`check`、`scan`、`stale`、`review-summary`
- 可以运行 `propose` 和 `remember` 来生成 proposal
- 不要运行 `project-atlas apply`
- 不要把 `project-atlas apply` 配成 MCP 工具、agent 工具、hook 或自动脚本
- 如果缺少 `knowledge/manifest.json`，先提示用户，再决定是否初始化
- 回答用户时，要说明读了哪些知识文件、跑了哪些命令、哪些点还需要人工 review

## 最短探针

在仓库根目录先运行：

```bash
command -v project-atlas
project-atlas --help
test -f knowledge/manifest.json && echo "project-atlas: initialized" || echo "project-atlas: missing manifest"
```

如果命令不存在：

```bash
npm install -g project-atlas
```

如果仓库还没有初始化，先征得用户同意，再执行：

```bash
project-atlas init --repo "$PWD" --template generic-service
```

## 读取上下文

按任务关键词读取上下文：

```bash
project-atlas context --repo "$PWD" --query "<task keywords>" --budget 8000 --format json
```

如果用户提到了具体文件，按来源文件反查：

```bash
project-atlas context --repo "$PWD" --source-file "<repo-relative-file>" --format json
```

如果任务依赖项目记忆元数据，按记忆字段过滤：

```bash
project-atlas context --repo "$PWD" --memory-type decision --topic "<topic>" --scope "<scope>" --format json
```

## 检查健康状态

在交付结论、创建 proposal 或准备发布前，先运行：

```bash
project-atlas check --repo "$PWD" --format json
```

如果结果里出现 missing sources、stale sources、missing metadata、bad links 或 duplicate topics，要在回答里明确说出风险。

## proposal 和 memory

通用 agent 接入只需要记住两个原则：

- 稳定项目知识走 `project-atlas propose`
- 稳定决策、经验和项目事实走 `project-atlas remember`

如果你在 OpenCode 中使用这些流程，完整教程看 [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)。

## review 摘要

生成 proposal 后，立刻查看：

```bash
project-atlas review-summary --repo "$PWD"
```

回答里至少要带上这些信息：

- proposal id
- target files
- source files
- dry-run summary
- review decision
- apply safety
- 是否仍然需要人工终端 apply

## MCP 工具范围

通过 `project-atlas-mcp` 接入时，只使用这些安全工具：

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

它没有 apply tool。只要 MCP 工具生成了 proposal，就要提醒用户回到终端人工 review 和 apply。

## MCP Client Config

Claude Code：

```bash
claude mcp add --transport stdio project-atlas -- project-atlas-mcp
```

Cursor 项目配置 `.cursor/mcp.json`：

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

Continue 配置：

```yaml
mcpServers:
  - name: project-atlas
    command: project-atlas-mcp
    args: []
```
