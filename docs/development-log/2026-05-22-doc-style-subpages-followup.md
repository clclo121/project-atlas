# 2026-05-22 参考风格子页面跟进记录

## 背景

在入口页按 `code-review-graph` 风格调整之后，用户确认继续把同样的表达节奏延伸到高频子页面。

本轮先收口三类高频页面：

- `quick-start`
- `agent-quickstart`
- `publish-now`

中英文版本一起调整。

## 这次参考的风格点

这轮继续沿用这些风格特点：

1. 页面开头先用一句很短的话定义这页的任务。
2. 语言切换入口放在首屏。
3. 用分隔线把页面切成几个短块。
4. 让每一页先回答“这页要帮用户完成什么”，再展开细节。
5. 保持 Quick Start 和关键命令靠前。

## 本轮改动文件

- `docs/site/quick-start.md`
- `docs/site/en/quick-start.md`
- `docs/site/agent-quickstart.md`
- `docs/site/en/agent-quickstart.md`
- `docs/site/publish-now.md`
- `docs/site/en/publish-now.md`

## 具体调整

### quick-start

- 增加更短的页首口号
- 增加中英文切换入口
- 把“跑完会得到什么”提前
- 用分隔线拆开本仓库试用、npm 包试用、最短流程和下一步阅读
- 把人工 apply 边界单独提出来

### agent-quickstart

- 增加更短的页首口号
- 增加中英文切换入口
- 每个能力块前都补分隔线
- 把规则、probe、context、health、proposal、MCP 和安全边界拆得更清楚

### publish-now

- 增加更短的页首口号
- 增加中英文切换入口
- 用分隔线拆开状态检查、验证、打包检查、登录、发布、发布后检查和失败排查

## 没有调整的范围

本轮没有继续动这些页面：

- `best-practices`
- `team-rollout`
- `security-faq`
- `release-process`

原因是先收口最常被用户直接打开的页面，避免一次改动过散。

## 验证

本轮执行：

```bash
npm test
```

结果：

- 测试通过，24 个测试全部通过

## 结论

目前 Project Atlas 的首层入口和三类高频子页面，已经基本统一到同一套产品化文档节奏。

后续如果继续往下统一风格，下一批适合处理的是：

1. `best-practices`
2. `team-rollout`
3. `release-process`
