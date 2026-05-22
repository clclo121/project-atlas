# 2026-05-21 project-atlas P2 生态能力记录

## 本轮目标

- 只收口 `docs/remaining-tasks.md` 中的 P2 项。
- 不开发 P3 的文档站点、CI 工作流和发布流程。
- 保持安全边界不变。`apply` 仍然只能由人工在终端 TTY 确认后执行。

## 实现过程

1. 确认基线。
   - 当前分支为 `main`，跟踪 `origin/main`。
   - 实施前执行 `npm test`，原有 13 个用例全部通过。

2. 先补失败测试。
   - 新增 `scan --external-evidence-file` 正常导入测试。
   - 新增非法外部证据 JSON 和缺少关键字段的短错误测试。
   - 新增 `propose --external-evidence-file` 和 `updates-file.external_evidence` 合并测试。
   - 新增 `review-summary` 的 `External Evidence` 输出测试。
   - 新增 `external-evidence.schema.json` 结构测试。
   - 新增 Claude Code、Cursor、Continue adapter 安全文档测试。
   - 新增 MCP 本地烟测，验证工具列表和 scan、context、propose 调用。

3. 实现外部代码证据导入。
   - `scan` 新增 `--external-evidence-file`。
   - `propose` 新增 `--external-evidence-file`。
   - `updates-file` 支持顶层 `external_evidence`。
   - 外部证据只做轻量 JSON 解析和字段校验，不依赖外部代码图谱工具。
   - `proposal.json` 保存 `external_evidence`，`review-summary` 增加 `External Evidence` 区域。

4. 实现 MCP server。
   - 新增 `src/mcp.ts`。
   - 新增 package bin `project-atlas-mcp`，指向 `dist/mcp.js`。
   - 使用 `@modelcontextprotocol/server` 的 `McpServer` 和 `StdioServerTransport`。
   - MCP 工具内部复用 CLI 输出。
   - 只暴露 `project_atlas_scan`、`project_atlas_context`、`project_atlas_stale`、`project_atlas_propose`、`project_atlas_review_summary`。
   - `project_atlas_propose` 输出中明确提示人工回到终端执行 apply。
   - SDK 当前版本运行时需要 `@cfworker/json-schema`，已作为运行依赖加入。

5. 补 adapter 文档。
   - 新增 `adapters/claude-code/README.md`。
   - 新增 `adapters/cursor/README.md`。
   - 新增 `adapters/continue/README.md`。
   - 三个 adapter 都只依赖 `project-atlas-mcp` 或安全 CLI 能力。
   - 三个 adapter 都不提供模型可调用的 apply 能力。

6. 补公开文档和 schema。
   - 新增 `schema/external-evidence.schema.json`。
   - 更新 `schema/proposal.schema.json`，加入 `external_evidence`。
   - README 增加 MCP、adapter 和外部证据使用说明。
   - `docs/remaining-tasks.md` 将 P2 标记为已完成。

## 验证命令

本轮收口需要执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
node dist/index.js scan --help
node dist/index.js propose --help
node dist/mcp.js --help
```

## 未纳入本轮

- 不做远程 HTTP MCP server。
- 不做真实 Claude Code、Cursor、Continue 客户端人工验收。
- 不接入 Serena、Codebase-Memory 或 Aider Repo Map 的运行时。
- 不做文档站点。
- 不做 GitHub Actions。
- 不做 SemVer 发布流程自动化。
