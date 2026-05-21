# Project KB 最佳实践

Project KB 适合沉淀稳定、可验证、会被多次复用的项目知识。它不适合自动生成整仓长文档。

## 写什么

- 项目定位和模块边界。
- 业务术语和页面、接口、任务的真实含义。
- 稳定流程，比如订单、支付、审核、同步。
- 对外契约，比如 API、MQ、文件、配置。
- 风险点，比如敏感配置、人工操作、迁移约束。
- 已经确认的技术或业务决策。

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

## 更新节奏

- 小改动只在需要时更新相关知识。
- 跨模块需求完成后，运行 `scan` 和 `stale`。
- 由 agent 生成 proposal，由人 review 后再 apply。
- 每次发布前确认 `review-summary` 没有敏感阻断。

## Agent 使用建议

Agent 开始任务前先读：

```bash
project-kb context --repo /path/to/repo --query "<task topic>"
```

任务结束后，如果稳定知识发生变化，再生成 proposal：

```bash
project-kb propose --repo /path/to/repo --updates-file updates.json --reason "refresh project knowledge"
```

Project KB 的重点是让团队少重复解释项目背景，同时保留人工把关。
