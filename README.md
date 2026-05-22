# Project Atlas

Project Atlas 是一个 Git 优先的项目知识库治理 CLI，面向 AI 编程 agent 和人工 reviewer。npm 包名是 `project-atlas`。

CLI 命令名是 `project-atlas`。本地 MCP server 命令名是 `project-atlas-mcp`。项目把长期知识放在 `knowledge/`，把本地 proposal 证据放在 `.project-atlas/proposals/`，并要求真实写入必须由人在终端 TTY 中确认。

## 解决什么问题

- 减少 AI 每次任务都重新通读项目的成本。
- 用 `knowledge/` 保存可复用的项目知识和项目级记忆。
- 通过 source files、hash、proposal 和 trigger evidence 让知识更新可审查。
- 保持安全边界，模型不能直接写入知识库。
- 让 reviewer 通过 `review-summary` 快速判断 proposal 是否可 apply。

## 文档入口

先看 [docs/site/README.md](docs/site/README.md)。里面包含快速开始、最佳实践、团队落地、安全 FAQ 和发布流程。

如果现在准备发布 npm 包，直接看 [docs/site/publish-now.md](docs/site/publish-now.md)。

## 常用命令

```bash
npm install
npm run build

node dist/index.js init --repo /path/to/repo --template java-backend
node dist/index.js scan --repo /path/to/repo --mode full --external-evidence-file evidence.json
node dist/index.js context --repo /path/to/repo --query "order payment" --budget 8000
node dist/index.js context --repo /path/to/repo --source-file README.md --format json
node dist/index.js stale --repo /path/to/repo
node dist/index.js propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason "update project knowledge" --inherit-source-metadata
node dist/index.js remember --repo /path/to/repo --candidate-file memory.json --reason "capture project memory"
node dist/index.js check --repo /path/to/repo --format json
node dist/index.js review-summary --repo /path/to/repo
node dist/index.js apply --repo /path/to/repo --proposal-id <id> --confirm
node dist/mcp.js --help
```

安装成 npm 包后，用 `project-atlas` 替代 `node dist/index.js`。

```bash
project-atlas --help
project-atlas-mcp --help
```

## 知识库结构

`project-atlas init` 会创建：

- `knowledge/project/overview.md`
- `knowledge/domains/`
- `knowledge/workflows/`
- `knowledge/contracts/`
- `knowledge/integrations/`
- `knowledge/quality/`
- `knowledge/decisions/`

生成的知识文档使用 YAML frontmatter，包含 `source_files`、`source_hashes`、`generated_by` 和 `review_status`。项目记忆文档还可以包含 `memory_type`、`topic`、`scope`、`confidence`、`owner` 和 `related_docs`。

`project-atlas init` 支持三种模板：

- `generic-service`
- `java-backend`
- `frontend-app`

模板只影响初始说明和示例问题，不改变 `knowledge/` 目录结构，也不会覆盖已有文件。

## 上下文和审查

`project-atlas context` 支持多个关键词，默认任一关键词命中即可返回。来源优先级是 active OpenSpec changes、archived OpenSpec specs、`knowledge/`。

按来源文件反查知识文档：

```bash
project-atlas context --repo /path/to/repo --source-file README.md --format json
```

按项目记忆元数据过滤：

```bash
project-atlas context --repo /path/to/repo --memory-type decision --topic payment --scope backend --format json
```

JSON context pack 会返回 `source_type`、`truncated` 和 `budget_used`，方便 agent 判断内容来源和是否被截断。

`project-atlas stale` 会给出 stale、missing source 和 missing metadata 的建议动作。`project-atlas review-summary` 会输出 dry-run 规模、review decision 和 apply safety。

健康检查：

```bash
project-atlas check --repo /path/to/repo --format json
```

更新已有知识文件时，可以显式继承旧来源信息：

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh order knowledge" --inherit-source-metadata
```

## 项目级记忆

项目级记忆是团队共享记忆，仍然存放在 `knowledge/`。它不是个人长期记忆库，也不读取聊天记录。

`remember` 只接收结构化 JSON 候选文件，校验后生成 proposal，不直接写知识文件。

```bash
project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason "capture project memory"
```

候选文件示例：

```json
{
  "schema_version": "1.0",
  "source_files": ["docs/development-log/2026-05-22-example.md"],
  "memories": [
    {
      "target": "knowledge/decisions/payment-review.md",
      "memory_type": "decision",
      "topic": "payment review",
      "scope": "backend",
      "confidence": 0.9,
      "summary": "Payment review must check duplicate callbacks.",
      "body": "When changing payment callbacks, review duplicate notification handling before changing signature validation.",
      "owner": "platform-team",
      "related_docs": ["knowledge/workflows/payment.md"]
    }
  ]
}
```

记忆类型：

- `decision` 表示长期有效的决策。
- `experience` 表示已完成任务里的经验。
- `project_fact` 表示稳定项目事实。

## 外部证据

`scan` 和 `propose` 可以导入外部代码证据：

```bash
project-atlas scan --repo /path/to/repo --external-evidence-file evidence.json
project-atlas propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason "refresh knowledge"
```

外部证据文件结构：

```json
{
  "schema_version": "1.0",
  "external_evidence": [
    {
      "source": "aider-repo-map",
      "source_type": "repo_map",
      "path": "src/main/java/com/example/OrderService.java",
      "symbol": "OrderService",
      "summary": "Order service owns order planning rules.",
      "locator": "src/main/java/com/example/OrderService.java#L12",
      "confidence": 0.86
    }
  ]
}
```

外部工具不是硬依赖。没有外部证据时，`external_evidence` 是空数组。

## JSON Schema

npm 包会携带 JSON Schema draft 2020-12 文件：

- `schema/manifest.schema.json`
- `schema/proposal.schema.json`
- `schema/trigger-result.schema.json`
- `schema/context-pack.schema.json`
- `schema/external-evidence.schema.json`
- `schema/memory-candidate.schema.json`

当前公开 schema 版本是 `1.0`。补充描述不需要升级 schema 版本。不兼容字段变更必须升级 schema 版本，并在 changelog 写清迁移方式。

## OpenCode 适配器

OpenCode adapter 是示例适配层，只暴露 scan、context 和 propose，不暴露 apply。

先安装 `project-atlas`，再把这些目录复制到团队使用的 OpenCode 资产位置：

```text
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

临时项目验收：

```bash
project-atlas init --repo /tmp/project-atlas-demo
project-atlas scan --repo /tmp/project-atlas-demo --mode full
project-atlas context --repo /tmp/project-atlas-demo --query demo
project-atlas propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
```

proposal 输出必须提示用户回到终端执行 `project-atlas apply`。

## MCP 和 Agent 适配器

`project-atlas-mcp` 启动本地 stdio MCP server。它只暴露：

- `project_atlas_scan`
- `project_atlas_context`
- `project_atlas_stale`
- `project_atlas_propose`
- `project_atlas_remember`
- `project_atlas_check`
- `project_atlas_review_summary`

它不暴露 apply。proposal 仍然必须人工 review，并由人在终端执行 apply。

Claude Code：

```bash
claude mcp add --transport stdio project-atlas -- project-atlas-mcp
```

Cursor 项目配置：

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

更多说明见 `adapters/claude-code/`、`adapters/cursor/` 和 `adapters/continue/`。

## 发布前检查

发布前固定执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

`npm run verify` 会执行类型检查和测试。`npm test` 会先构建再运行测试。`npm run pack:dry-run` 是打包预检的快捷脚本。

`npm pack --dry-run` 应包含 `README.md`、`LICENSE`、`CHANGELOG.md`、`dist/`、`adapters/`、`schema/`、`templates/`、`docs/site/` 和 `package.json`。

## 如果现在要发布

当前包名 `project-atlas` 在 npm registry 未被占用，可以按首次发布处理。详细步骤见 [docs/site/publish-now.md](docs/site/publish-now.md)。

最短命令顺序：

```bash
git status --branch --short
npm run verify
npm pack --dry-run
npm login
npm whoami
npm publish
git tag v0.1.0
git push origin main --tags
```

发布前要先确认 `CHANGELOG.md` 已经把本次要发布的内容归入目标版本，并确认本地 `main` 已推送到 `origin/main`。如果 GitHub 仓库也要同步改名，需要先把远端仓库改成 `project-atlas`，再确认 `package.json` 的 repository URL 可访问。

## 第一版边界

- 只支持 Git 仓库。
- 不做 Web UI。
- 只提供本地 stdio MCP server，不提供远程 HTTP MCP server。
- 不内置语义检索或代码图谱。
- 不提供模型可调用的 apply 工具。
- 不提供个人长期记忆库。
- OpenCode、Claude Code、Cursor 和 Continue 支持都是 adapter 示例，不是核心产品。
