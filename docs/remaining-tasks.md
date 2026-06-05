# project-atlas 剩余待开发项

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

- 增加 `project-atlas --help`。
- 增加每个子命令的 `--help`。
- 给参数错误补使用示例。
- 错误信息保持短句，避免堆栈直接暴露给普通用户。

验收标准：

- `project-atlas --help` 能列出所有命令。
- `project-atlas context --help` 能说明 `--repo`、`--query`、`--budget`、`--format`。
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
- 用一个临时项目验证 `project_atlas_scan`、`project_atlas_context`、`project_atlas_propose`。

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

## P2 开源生态能力（已完成）

完成状态：

- 2026-05-21 已补齐本地 stdio MCP server、Claude Code/Cursor/Continue adapter 说明和外部代码证据导入。
- 详细实现记录见 `docs/development-log/2026-05-21-p2-ecosystem.md`。

### 9. MCP server

当前状态：

- 已提供 `project-atlas-mcp` 本地 stdio MCP server。
- MCP server 只暴露安全工具，不暴露 apply。

完成内容：

- 只暴露 `scan`、`context`、`stale`、`propose`、`review-summary`。
- 不暴露 `apply`。
- 增加 MCP 安全说明。

验收标准：

- Claude Code、Cursor、Continue 等 MCP 客户端可以读取上下文和生成 proposal。
- 没有模型可直接调用的写入工具。

### 10. 多 Agent adapter

当前状态：

- 已有 OpenCode 示例适配层。
- 已新增 Claude Code、Cursor 和 Continue 适配说明。

完成内容：

- 增加 Claude Code 适配说明。
- 增加 Continue context provider 示例。
- 增加 Cursor 使用说明。

验收标准：

- 每个 adapter 都只依赖 `project-atlas` CLI。
- 每个 adapter 都不提供 apply 能力。

### 11. 外部代码证据接入

当前状态：

- `scan` 支持通过 `--external-evidence-file` 导入 `external_evidence`。
- `scan` 支持显式 `--format json`，默认仍输出 JSON。
- `scan` 已输出 `facts` 和 `evidence_plan`，让 Agent 按目标知识文件读取证据。
- `scan` 会对 external evidence 的路径、`base_commit` 和 `generated_at` 输出 warning。
- `scan` 支持 `--review-depth standard|deep`，deep 模式输出 `review_plan`。
- `propose` 支持从 `updates-file` 和 `--external-evidence-file` 合并外部证据。
- `propose` 会保存 `evidence_plan_summary`、`quality_score`、`coverage_score` 和 `update_reason_summary`，供 review-summary 审核。
- 已补充 `examples/external-evidence/code-review-graph.json`，用于展示 code-review-graph 风格证据如何进入 Project Atlas。
- 未把 Serena、Codebase-Memory 或 Aider Repo Map 作为硬依赖。

完成内容：

- 设计 `external_evidence` 标准结构。
- 支持从外部 JSON 文件导入代码图谱或 repo map 结果。
- 支持 external evidence 的 `generated_at`、`base_commit`、`tool_version` 和 `coverage_summary`。
- 支持 deep review 计划中识别缺少的外部证据类型，例如 `architecture_overview`、`impact_radius` 和 `test_gap`。
- 不把外部工具作为硬依赖。

验收标准：

- 没有外部工具时仍可正常使用。
- 有外部证据时，proposal 和 review summary 能引用来源。

## 知识库生成深度优化（已完成）

完成状态：

- 2026-06-05 已补齐扫描结构、候选分组、质量 warning、外部证据示例和 OpenCode 生成提示。
- 详细实现记录见 `docs/development-log/2026-06-05-kb-generation-depth.md`。

### 17. 扫描结构和候选分组

当前状态：

- `scan` 继续保留 Java controller、service、feign、tasks、mq、remote、config 识别。
- 新增 TypeScript CLI、MCP、adapter、commands、tools、schema、docs、tests 和 build/config 识别。
- `ScanResult.candidates` 保留 `domains`、`workflows`、`integrations`、`risks`，并新增 `contracts`、`quality`。
- `ScanResult.facts` 固化 package、MCP、adapter、schema 和 test 事实。
- `ScanResult.evidence_plan` 固化每个候选目标的推荐证据和缺口。
- `ScanResult.review_plan` 在 deep 模式下固化审查重点、缺少的外部证据、风险标记和关联事实。
- 新增 `schema/scan-result.schema.json` 固化公开输出结构。

验收标准：

- TypeScript CLI 仓库可以识别 CLI、MCP、schema、adapter、test、docs 和 build 资产。
- Java fixture 的原有入口识别不回退。
- 旧调用方读取 `integrations` 和 `risks` 仍然兼容。

### 18. 生成内容质量门槛

当前状态：

- `check` 输出 `shallow_document`、`weak_evidence`、`missing_practical_sections` warning。
- `propose` 会把拟生成内容的质量 warning 写入 `proposal_quality_findings`。
- `propose` 会为 proposal 写入 `quality_score`。
- `propose` 会为 proposal 写入 `coverage_score` 和 `update_reason_summary`。
- `review-summary` 展示当前知识库、拟生成内容、质量分、证据计划覆盖和 Deep Review Coverage；拟生成内容存在 warning、质量分低于 70 或覆盖分低于 70 时，`can_apply` 为 `no`。

验收标准：

- warning 不阻断健康检查和人工 apply。
- reviewer 能在 apply 前看到浅内容、弱证据和缺少实用章节的问题，且 review-summary 不再推荐直接 apply。

### 19. 敏感扫描扩展

当前状态：

- 配置扫描和 proposal 敏感内容检测覆盖 password、token、api key、access key、authorization、cookie、npm token、private key 和带账号密码的数据源 URL。
- external evidence 导入时也会扫描敏感内容。
- scanner、proposal 和 external evidence 复用同一套敏感规则。
- 命中敏感内容时只保存规则、路径和动作，不保存原文。

验收标准：

- `.env`、`.npmrc` 和常见配置文件能输出脱敏风险摘要。
- proposal 命中敏感规则时保持 `blocked_sensitive`。
- external evidence 命中敏感规则时拒绝导入，且错误不包含敏感原文。

## P3 产品体验和治理（已完成）

完成状态：

- 2026-05-21 已补齐轻量 Markdown 文档站点、GitHub Actions CI 和发布治理说明。
- 详细实现记录见 `docs/development-log/2026-05-21-p3-governance.md`。

### 12. 文档站点

当前状态：

- 已提供 `docs/site/` 轻量 Markdown 文档入口。

完成内容：

- 增加快速开始。
- 增加最佳实践。
- 增加团队落地流程。
- 增加安全 FAQ。
- 增加发布流程说明。

验收标准：

- 新用户可以在 10 分钟内完成 init、context、propose、review-summary。

### 13. CI 工作流

当前状态：

- 本地命令已通过。
- 已新增 GitHub Actions。

完成内容：

- 增加 Node 22、24、26 测试矩阵。
- 增加 `npm run lint:types`、`npm run build`、`npm test`。
- 增加 `npm pack --dry-run`。

验收标准：

- PR 自动验证核心命令。

### 14. 发布流程

当前状态：

- 已在 `docs/site/release-process.md` 记录版本发布约定。

完成内容：

- 约定 SemVer。
- 约定 changelog 格式。
- 约定 npm 发布前检查清单。

验收标准：

- 发布前可以按清单完成验证和打包。

## 项目级记忆能力（已完成）

完成状态：

- 2026-05-21 已新增 `remember` 和 `check`。
- 项目记忆仍然落在 `knowledge/`，并且只能通过 proposal 和人工终端 apply 进入仓库。
- MCP 已新增 `project_atlas_remember` 和 `project_atlas_check`，仍然不暴露 apply。
- 详细实现记录见 `docs/development-log/2026-05-21-memory-capability.md`。

### 15. 记忆候选和 proposal

当前状态：

- `remember` 只接受结构化 JSON 候选文件。
- 候选文件 schema 版本固定为 `1.0`。
- 支持 `decision`、`experience` 和 `project_fact` 三种记忆类型。
- 默认禁止覆盖已有目标文件，显式传 `--replace-existing` 才允许替换。

完成内容：

- 新增 `schema/memory-candidate.schema.json`。
- 生成的知识文件写入 `memory_type`、`topic`、`scope`、`confidence`、`owner` 和 `related_docs` 等 frontmatter。
- 继续写入 `source_files` 和 `source_hashes`，方便 stale 和 check 发现过期来源。

验收标准：

- agent 可以生成记忆 proposal。
- 真实写入仍然只能由人执行终端 apply。

### 16. 记忆读取和健康检查

当前状态：

- `context` 支持按 `--memory-type`、`--topic` 和 `--scope` 过滤项目记忆。
- JSON 输出会给 items 增加 metadata，方便 agent 判断适用范围。
- `check` 支持 Markdown 和 JSON 输出。

完成内容：

- 检查 manifest、required files、frontmatter、source hash、missing source、空文档、坏相对链接、重复 topic 和 schema JSON。
- README 和文档站点补充项目记忆、个人记忆、代码图谱和外部证据的边界说明。

验收标准：

- 团队可以在发布前或交接前运行健康检查。
- 记忆可以被模型按任务主题读取，但不能被模型绕过 review 写入。

## 暂不建议开发

- Web UI。
- 云端同步。
- 自动 apply。
- 自动全仓长文档生成。
- 自研语义检索引擎。
- 自研代码图谱。
- 个人长期记忆库。

这些能力会把项目从知识库治理 CLI 拉向平台型产品。当前阶段应该先把 CLI、schema、证据协议和人工确认写入做稳定。
