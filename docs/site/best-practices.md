# Project Atlas 最佳实践

Project Atlas 适合沉淀稳定、可验证、会被多次复用的项目知识。它不适合自动生成整仓长文档。

## 写什么

- 项目定位和模块边界。
- 业务术语和页面、接口、任务的真实含义。
- 稳定流程，比如订单、支付、审核、同步。
- 对外契约，比如 API、MQ、文件、配置。
- 风险点，比如敏感配置、人工操作、迁移约束。
- 已经确认的技术或业务决策。
- 可复用项目记忆，比如稳定事实、已做决策和踩坑经验。

## 不写什么

- 临时调试过程。
- 未验证的猜测。
- 大段源码复制。
- 过期设计稿。
- 密钥、token、密码和真实敏感配置值。

## 来源文件

每篇知识文档都应该能追溯到来源文件。建议优先引用：

- README 和需求文档。
- OpenSpec 规格。
- 关键源码入口。
- 配置样例。
- 已确认的开发日志。

`source_files` 和 `source_hashes` 可以让 stale 检测发现知识是否过期。

## 项目记忆

项目记忆适合写三类内容：

- `decision` 记录已经确认的决策，适合后续任务直接遵守。
- `experience` 记录完成过的工作经验，适合避免重复试错。
- `project_fact` 记录稳定项目事实，适合新任务快速理解背景。

记忆内容必须有来源。来源可以是 README、开发日志、OpenSpec、关键代码入口或 review 结论。不要把个人偏好、未验证猜测和聊天原文写成项目记忆。

建议把记忆目标放在合适目录：

- 决策放 `knowledge/decisions/`。
- 业务事实放 `knowledge/domains/` 或 `knowledge/project/`。
- 经验放最接近的业务或质量目录。

生成记忆 proposal：

```bash
project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason "capture stable project memory"
```

默认不会覆盖已有目标文件。确实要替换时，显式加 `--replace-existing`，并在 review 中说明原因。

## 更新节奏

- 小改动只在需要时更新相关知识。
- 跨模块需求完成后，运行 `scan` 和 `stale`。
- 由 agent 生成 proposal，由人 review 后再 apply。
- 每次发布前确认 `review-summary` 没有敏感阻断。
- 发布前或交接前运行 `project-atlas check`，确认知识库健康。

## Agent 使用建议

Agent 开始任务前先读：

```bash
project-atlas context --repo /path/to/repo --query "<task topic>"
```

任务结束后，如果稳定知识发生变化，再生成 proposal：

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh project knowledge"
```

如果任务沉淀的是项目记忆，使用：

```bash
project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason "capture task memory"
```

Project Atlas 的重点是让团队少重复解释项目背景，同时保留人工把关。
