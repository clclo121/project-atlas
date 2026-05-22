# 最佳实践

Project Atlas 适合沉淀稳定、可验证、会被反复复用的项目知识。它不适合把整仓扫描结果原样堆成一大份长文档。

## 适合写什么

优先写这些内容：

- 项目定位、模块边界、目录职责
- 业务术语和关键页面、接口、任务的真实含义
- 稳定流程，比如下单、支付、审核、同步
- 对外契约，比如 API、MQ、文件格式、配置约束
- 风险点，比如敏感配置、人工步骤、迁移前提
- 已经确认的技术决策和业务决策
- 已经验证过的项目记忆，比如稳定事实、经验和结论

## 不适合写什么

不要把这些内容直接沉淀进知识库：

- 临时排障过程
- 还没验证的猜测
- 大段源码复制
- 已经过期的设计稿
- 密钥、token、密码和真实敏感值
- 只属于个人偏好的操作习惯

## 来源要足够清楚

每篇知识文档都应该能追溯到来源文件。常见优先级如下：

1. README、需求文档、发布说明
2. OpenSpec 或其他正式规格
3. 关键源码入口和配置样例
4. 已确认的开发日志和 review 结论

`source_files` 和 `source_hashes` 不是装饰字段。它们决定 `stale` 能不能发现知识过期。

## 项目记忆怎么写

项目记忆适合三类内容：

- `decision`
  已经确认并需要长期遵守的决策
- `experience`
  已完成任务里有复用价值的经验
- `project_fact`
  稳定、客观、可复用的项目事实

项目记忆也必须有来源。推荐来源包括 README、开发日志、正式规格、关键代码入口和 review 结论。

不要把聊天原文、个人猜测和未经验证的结论写成项目记忆。

## 目录怎么选

把知识放到最接近的目录：

- 决策放 `knowledge/decisions/`
- 项目背景放 `knowledge/project/`
- 业务事实放 `knowledge/domains/`
- 流程说明放 `knowledge/workflows/`
- 契约和集成说明放 `knowledge/contracts/` 或 `knowledge/integrations/`
- 质量要求和排查经验放 `knowledge/quality/`

## 更新节奏

推荐的节奏很简单：

1. 任务开始前先读 `context`
2. 任务结束后判断有没有稳定知识变化
3. 有变化再生成 `propose` 或 `remember`
4. reviewer 先看 `review-summary`
5. 最后由人执行 `apply`

跨模块需求、发布前和交接前，建议补跑：

```bash
project-atlas check --repo /path/to/repo --format json
project-atlas stale --repo /path/to/repo
```

## Agent 使用建议

agent 不要一上来就全仓搜索。先读：

```bash
project-atlas context --repo /path/to/repo --query "<task topic>" --budget 8000 --format json
```

任务结束后，如果要更新知识库，再生成 proposal：

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh project knowledge"
```

Project Atlas 的目标不是让文档越来越多，而是让真正可复用的知识越来越可信。
