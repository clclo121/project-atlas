# Project Atlas Agent 快速接入

让 agent 先读可信知识，再动源码。

[English](en/agent-quickstart.md) | [简体中文](agent-quickstart.md)

这份文档给 AI 编程 agent 使用。目标是在任务开始后的前 60 秒内，先读取治理后的项目知识，再判断知识库是否健康，最后在需要时生成可审核的 proposal。

如果你是人工用户，想先跑一遍命令，先看 [快速开始](quick-start.md)。

---

## 先记住这几条规则

- 在大范围搜索源码之前，先读取 Project Atlas 上下文
- 默认优先使用只读命令
- 可以运行 `context`、`check`、`scan`、`stale`、`review-summary`
- 可以运行 `propose` 和 `remember` 来生成 proposal
- 不要运行 `project-atlas apply`
- 不要把 `project-atlas apply` 配成 MCP 工具、agent 工具、hook 或自动脚本
- 如果缺少 `knowledge/manifest.json`，不要静默初始化仓库，要先提示用户并给出命令
- 回答用户时，要说明读取了哪些知识文件、执行了哪些命令、哪些点还需要人工 review

---

## First Probe

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

Java 后端仓库可以使用：

```bash
project-atlas init --repo "$PWD" --template java-backend
```

前端仓库可以使用：

```bash
project-atlas init --repo "$PWD" --template frontend-app
```

---

## Read Context

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

重点查看这些字段：

- `items[].source_path`
- `items[].source_type`
- `items[].metadata`
- `truncated`
- `budget_used`

如果 `truncated` 为 `true`，缩小关键词范围或增大 `--budget` 后再读一次。

---

## Health Check

在生成 proposal、交接结果或准备发布前，先运行：

```bash
project-atlas check --repo "$PWD" --format json
```

如果结果里出现 missing sources、stale sources、missing metadata、bad links 或 duplicate topics，要在回答里明确说出风险，不要把这些知识当成完全可信。

---

## Create A Knowledge Proposal

当任务产生了稳定项目知识时，先准备 `updates.json`：

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

然后生成 proposal：

```bash
project-atlas propose --repo "$PWD" --updates-file updates.json --reason "<why this knowledge changed>"
```

如果目标知识文件已经带有来源元数据，并且用户明确要求继承旧来源信息，再使用：

```bash
project-atlas propose --repo "$PWD" --updates-file updates.json --reason "<why this knowledge changed>" --inherit-source-metadata
```

---

## Create A Project Memory Proposal

当任务产生了稳定决策、经验或项目事实时，准备 `memory.json`：

```json
{
  "schema_version": "1.0",
  "source_files": ["docs/development-log/example.md"],
  "memories": [
    {
      "target": "knowledge/decisions/example.md",
      "memory_type": "decision",
      "topic": "example decision",
      "scope": "backend",
      "confidence": 0.9,
      "summary": "Short stable memory summary.",
      "body": "Detailed memory body with source evidence."
    }
  ]
}
```

生成项目记忆 proposal：

```bash
project-atlas remember --repo "$PWD" --candidate-file memory.json --reason "<why this memory matters>"
```

允许的记忆类型有三种：

- `decision`
- `experience`
- `project_fact`

---

## Review Summary

生成 proposal 后，立刻查看摘要：

```bash
project-atlas review-summary --repo "$PWD"
```

回答里至少要带上这些信息：

- proposal id
- target files
- source files
- dry-run 摘要
- review decision
- apply safety
- 是否还需要人工终端 apply

---

## MCP

通过 `project-atlas-mcp` 接入时，只使用这些安全工具：

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

没有 apply tool。只要 MCP 工具生成了 proposal，就要提醒用户回到终端人工 review 和 apply。

---

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

---

## 安全边界

- 不要让模型直接调用 `project-atlas apply`
- 不要绕过 proposal 直接写 `knowledge/**`
- 不要把聊天记录当成项目记忆来源
- 不要把不健康的知识库结果当成最终事实

---

## 回答模板

```text
Project Atlas:
- commands run:
- knowledge files used:
- stale or health issues:
- proposal id, if created:
- apply status: human terminal apply required or not needed

Task answer:
- ...
```
