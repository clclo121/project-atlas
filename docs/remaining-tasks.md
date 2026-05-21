# project-kb-core 剩余待开发项

本文记录第一版实现后的剩余工作。优先级按开源可用性和团队落地价值排序。

## P0 开源发布前必须补齐（已完成）

完成状态：

- 2026-05-21 已补齐 CLI 帮助、JSON Schema、OpenCode adapter 本地烟测和 package 发布信息。
- 详细实现记录见 `docs/development-log/2026-05-21-p0-release-readiness.md`。

### 1. CLI 帮助和错误信息

当前状态：

- 已有统一 `--help` 输出。
- 未知命令、未知参数、缺少必填参数和非法参数值都会输出短错误和使用示例。

完成内容：

- 增加 `project-kb --help`。
- 增加每个子命令的 `--help`。
- 给参数错误补使用示例。
- 错误信息保持短句，避免堆栈直接暴露给普通用户。

验收标准：

- `project-kb --help` 能列出所有命令。
- `project-kb context --help` 能说明 `--repo`、`--query`、`--budget`、`--format`。
- 参数错误时 exit code 非 0，并输出可操作提示。

### 2. JSON Schema 独立化

当前状态：

- proposal、trigger result、manifest 和 context pack 已有独立 schema 文件。
- schema 文件已纳入 npm 包。

完成内容：

- 新增 `schema/manifest.schema.json`。
- 新增 `schema/proposal.schema.json`。
- 新增 `schema/trigger-result.schema.json`。
- 新增 `schema/context-pack.schema.json`。
- 在 README 中说明 schema 版本策略。

验收标准：

- schema 文件能被普通 JSON Schema 工具读取。
- 测试中至少校验 proposal 和 trigger result 的关键字段。

### 3. OpenCode adapter 运行验证

当前状态：

- 已提供示例 tools、commands 和 skill。
- 已增加本地 adapter 安全烟测。
- 真实 OpenCode 环境验收仍作为后续人工验证，不属于本轮自动化范围。

完成内容：

- 增加 adapter README 的安装步骤。
- 增加最小手工验收清单。
- 用一个临时项目验证 `project_kb_scan`、`project_kb_context`、`project_kb_propose`。

验收标准：

- OpenCode 能调用三个示例工具。
- 工具不会提供 apply 能力。
- proposal 后能提示人工终端命令。

### 4. package 发布信息

当前状态：

- `package.json` 已有 bin、files、engines。
- 已补开源发布常见字段。

完成内容：

- 补 `license`。
- 补 `repository`。
- 补 `keywords`。
- 补 `author` 或保持空值策略。
- 新增 `LICENSE`。
- 新增 `CHANGELOG.md`。

验收标准：

- `npm pack --dry-run` 输出只包含预期文件。
- README、LICENSE、dist、adapters、schema 被纳入包。

## P1 提升真实项目可用性（已完成）

完成状态：

- 2026-05-21 已补齐 context 多关键词和来源反查、stale 建议、review-summary 风险摘要、propose source metadata 显式继承和 init template。
- 详细实现记录见 `docs/development-log/2026-05-21-p1-usability.md`。

### 5. context pack 质量增强

当前状态：

- `context` 已按来源优先级输出上下文。
- 已支持多个 query 关键词，默认任一命中。
- 已支持按 `source_files` 反查知识文档。

完成内容：

- 支持多个 query 关键词。
- 支持按 `source_files` 反查知识文档。
- 输出中增加 source type，如 `openspec_change`、`openspec_spec`、`knowledge`。
- JSON 输出增加 `truncated` 和 `budget_used`。

验收标准：

- 同一主题下优先返回规格，再返回知识文档。
- JSON 能明确说明哪些内容被截断。

### 6. stale 检测增强

当前状态：

- 已根据 source hash 判断 fresh、stale、missing source 和 missing metadata。
- 已对 stale、proposal 和 review summary 补联动建议。

完成内容：

- `stale` 输出建议命令。
- `review-summary` 中高亮 stale 文档。
- `propose` 可选择自动继承旧文档的 source metadata。

验收标准：

- stale 文档能直接看到建议处理方式。
- reviewer 不需要读 JSON 就能判断哪些知识已过期。

### 7. review-summary 增强

当前状态：

- 已输出 proposal、source、target、敏感扫描和 stale 状态。
- 已输出 dry-run 摘要和风险分组。

完成内容：

- 摘要 dry-run.diff 的目标文件和变更规模。
- 增加 `Review Decision` 区域。
- 增加 `Apply Safety` 区域，说明是否可 apply、是否 blocked、是否 stale。

验收标准：

- reviewer 打开 summary 后能直接给出通过、退回或敏感阻断结论。

### 8. 初始化模板增强

当前状态：

- `init` 创建通用目录和 `project/overview.md`。
- 已支持三种轻量模板。

完成内容：

- 增加 `templates/java-backend`。
- 增加 `templates/generic-service`。
- 增加 `templates/frontend-app`。
- `init` 支持 `--template`。

验收标准：

- 不同模板生成不同的目录说明和示例问题。
- 默认仍使用 `generic-service` 或通用模板。

## P2 开源生态能力

### 9. MCP server

当前状态：

- 明确不属于第一版。

待开发：

- 只暴露 `scan`、`context`、`stale`、`propose`、`review-summary`。
- 不暴露 `apply`。
- 增加 MCP 安全说明。

验收标准：

- Claude Code、Cursor、Continue 等 MCP 客户端可以读取上下文和生成 proposal。
- 没有模型可直接调用的写入工具。

### 10. 多 Agent adapter

当前状态：

- 已有 OpenCode 示例适配层。

待开发：

- 增加 Claude Code 适配说明。
- 增加 Continue context provider 示例。
- 增加 Cursor 使用说明。

验收标准：

- 每个 adapter 都只依赖 `project-kb` CLI。
- 每个 adapter 都不提供 apply 能力。

### 11. 外部代码证据接入

当前状态：

- `scan` 预留了 `external_evidence`。
- 未接入 Serena、Codebase-Memory 或 Aider Repo Map。

待开发：

- 设计 `external_evidence` 标准结构。
- 支持从外部 JSON 文件导入代码图谱或 repo map 结果。
- 不把外部工具作为硬依赖。

验收标准：

- 没有外部工具时仍可正常使用。
- 有外部证据时，proposal 和 review summary 能引用来源。

## P3 产品体验和治理

### 12. 文档站点

当前状态：

- 只有 README 和 docs Markdown。

待开发：

- 增加快速开始。
- 增加最佳实践。
- 增加团队落地流程。
- 增加安全 FAQ。

验收标准：

- 新用户可以在 10 分钟内完成 init、context、propose、review-summary。

### 13. CI 工作流

当前状态：

- 本地命令已通过。
- 还没有 GitHub Actions。

待开发：

- 增加 Node 18、20、22 测试矩阵。
- 增加 `npm run lint:types`、`npm run build`、`npm test`。
- 增加 `npm pack --dry-run`。

验收标准：

- PR 自动验证核心命令。

### 14. 发布流程

当前状态：

- 还没有版本发布约定。

待开发：

- 约定 SemVer。
- 约定 changelog 格式。
- 约定 npm 发布前检查清单。

验收标准：

- 发布前可以按清单完成验证和打包。

## 暂不建议开发

- Web UI。
- 云端同步。
- 自动 apply。
- 自动全仓长文档生成。
- 自研语义检索引擎。
- 自研代码图谱。
- 个人长期记忆库。

这些能力会把项目从知识库治理 CLI 拉向平台型产品。当前阶段应该先把 CLI、schema、证据协议和人工确认写入做稳定。
