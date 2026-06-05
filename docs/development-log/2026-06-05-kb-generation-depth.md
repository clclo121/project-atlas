# 2026-06-05 知识库生成深度优化记录

## 目标

本轮目标是解决首次生成知识库内容偏少、偏浅的问题。优化重点不是让模型无证据扩写，而是让 `scan` 输出更完整的项目结构、候选知识目标和证据文件，并让 OpenCode 命令在生成前形成证据读取计划。

## 改动

1. 扩展 `scan` 项目发现能力。
   - 保留 Java controller、service、feign、tasks、mq、remote、config 识别。
   - 新增 CLI、MCP、adapter、commands、tools、schema、docs、tests、build/config 识别。
2. 扩展候选知识目标。
   - `Candidate` 在原有 `target`、`reason` 外新增 `source_files`、`confidence`、`category`。
   - 默认覆盖项目概览、CLI 命令、MCP server、Agent adapter、schema 契约、proposal/apply 流程、测试与发布质量策略。
   - 保留 `domains`、`workflows`、`integrations`、`risks`，新增 `contracts`、`quality`，旧调用方仍可读取 legacy 分组。
3. 增强外部证据链路。
   - OpenCode `project_atlas_scan` 支持 `externalEvidenceFile`。
   - `/kb-generate` 和 `/kb-refresh` 提示在可用时搭配 `code-review-graph` 做完整代码梳理，但不把它作为硬依赖。
   - 新增 `examples/external-evidence/code-review-graph.json`，展示代码图谱证据如何进入 `external_evidence`。
4. 增加内容质量 warning。
   - `check` 新增浅内容、弱证据、缺少实用章节提示。
   - `propose` 会对拟生成正文做同样的质量预检，并写入 `proposal_quality_findings`。
   - `review-summary` 展示当前知识库和拟生成内容的质量 warning；拟生成正文存在 warning 时，`can_apply` 为 `no`。
5. 扩展敏感扫描规则。
   - 配置扫描和 proposal 检测覆盖 password、token、api key、access key、authorization、cookie、npm token、private key 和带账号密码的数据源 URL。
   - external evidence 导入也复用同一套敏感规则，命中时拒绝导入。
   - 命中时只保存或输出规则、路径/字段和动作，不保存敏感原文。
6. 固化公开 schema 和文档。
   - 新增 `schema/scan-result.schema.json`。
   - `schema/proposal.schema.json` 增加 `proposal_quality_findings`。
   - 更新 OpenCode 文档、agent quickstart、安全 FAQ、remaining tasks 和 changelog。
7. 补齐基础能力风险治理。
   - `scan` 支持显式 `--format json`，修复文档命令和 CLI 契约不一致。
   - `updates-file.updates[]` 支持可选 `source_files`，单个目标文件优先使用自己的证据来源。
   - proposal operation 保存对应目标文件的 `source_files` 和 `source_hashes`，方便 reviewer 追踪 per-target evidence。
   - `.gitignore` 为 `dist/rules.js` 增加精确例外，避免新共享规则模块构建产物被忽略。
8. 结构化证据计划和质量评分。
   - `scan` 新增 `facts`，记录 package、MCP tools、adapter assets、schema 和 tests 等项目事实。
   - `scan` 新增 `evidence_plan`，按目标知识文件输出推荐读取文件、证据类型、缺口和置信度。
   - `propose` 新增 `evidence_plan_summary` 和 `quality_score`，reviewer 可以看到每个目标的证据覆盖和扣分项。
   - `review-summary` 展示 `Quality Score`、`Evidence Plan Coverage` 和 external evidence warnings；拟生成正文 warning 或质量分低于 70 时不推荐 apply。
   - external evidence 支持 `generated_at`、`base_commit`、`tool_version`、`coverage_summary`，scan/review-summary 会提示过期、路径缺失或 commit 不匹配。
9. 增加 deep review 能力。
   - `scan` 新增 `--review-depth standard|deep`，默认 `standard`。
   - deep 模式输出 `review_plan`，按候选目标给出审查重点、缺少的外部证据类型、风险标记、关联事实和推荐文件。
   - MCP 和 OpenCode `project_atlas_scan` 支持传入 review depth。
   - `/kb-generate` 固定使用 `mode=full`、`reviewDepth=deep`，`/kb-refresh` 固定使用 `mode=changed`、`reviewDepth=deep`。
10. 增加刷新和覆盖审查字段。
   - `propose` 新增 `update_reason_summary`，用于解释稳定知识变化依据。
   - `propose` 新增 `coverage_score`，按目标检查实际来源文件、缺少证据类型、外部证据 warning 和扣分项。
   - `review-summary` 新增 `Deep Review Coverage`，覆盖分低于 70 时 `can_apply` 为 `no`。

## 关键判断

- `code-review-graph` 只能作为 external evidence 增强项，不能进入 Project Atlas 运行时硬依赖。
- `check` 的内容质量第一阶段仍只做 warning，避免启发式规则误阻断健康检查。
- `review-summary` 对拟生成正文 warning 采取保守策略，不推荐直接 apply。
- `quality_score` 是 reviewer 决策辅助，不直接改变 `check` 的健康结果。
- `coverage_score` 和 `quality_score` 都是 reviewer 决策辅助；低于 70 时 review-summary 不推荐 apply，但不改变 proposal-first/human-apply 契约。
- `evidence_plan` 由 CLI 生成，OpenCode 命令优先消费它，不再只依赖提示词里的自然语言读取计划。
- `review_plan` 只在 deep 模式输出，用于约束深度审查的重点和外部证据缺口，不强制依赖 `code-review-graph`。
- 生成内容仍必须通过 proposal-first 流程，OpenCode 不提供 apply tool。

## 验证命令

```bash
npm run lint:types
npm test
npm run verify
```

## 验证结果

- `npm run lint:types` 通过。
- `npm test` 通过，33 个测试全部通过。
- `npm run verify` 通过。
- `npm run pack:dry-run` 通过，npm 包内容包含 `schema/scan-result.schema.json`、`examples/external-evidence/code-review-graph.json` 和 `dist/rules.js`。
- `git diff --check` 通过。
- `node dist/index.js scan --repo . --mode full --format json` 通过，确认文档里的 scan format 命令可执行。
- `node dist/index.js scan --repo . --mode full --format json` 已确认当前项目的 `facts` 和 `evidence_plan` 有效输出，默认候选目标没有误报证据缺口。
- `node dist/index.js scan --repo . --mode full --review-depth deep --format json` 通过，输出 `review_depth=deep`、7 个 `review_plan` 和 7 个 `evidence_plan`。

## 风险和后续建议

- 候选规则仍是启发式，后续可以继续根据真实项目反馈补充更多框架和语言入口。
- 浅内容规则可能对少量短但有效的记忆文档产生 warning，需要通过真实使用反馈调参。
- `quality_score` 当前是启发式分数，后续可以结合真实 apply/reject 反馈调权重。
- `coverage_score` 当前按文件类型和外部证据 warning 计分，后续可以把真实 reviewer 反馈纳入调权。
