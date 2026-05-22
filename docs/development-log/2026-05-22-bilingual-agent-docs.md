# 2026-05-22 中英文与 Agent 接入文档记录

## 背景

本轮目标是补齐中英文文档，并把文档重心转向 agent 自动快速接入。用户明确指出大多数人不会仔细读长文档，所以文档需要更像 agent 的执行协议，而不是普通教程。

## 实现过程

1. README 增加 agent 快速接入入口。
2. README 增加英文文档入口。
3. `docs/site/README.md` 把 Agent 快速接入放到推荐阅读第一位。
4. 新增中文 `docs/site/agent-quickstart.md`。
5. 新增英文入口 `docs/site/en/README.md`。
6. 新增英文 `docs/site/en/agent-quickstart.md`。
7. 新增英文 `docs/site/en/quick-start.md`。
8. 扩展测试，确保中英文入口和 agent 接入文档不会缺失。
9. 根据后续反馈，将 `docs/site/agent-quickstart.md` 调整为纯英文，并增加测试禁止该文件出现中文字符。

## Agent 文档口径

Agent 文档按执行协议组织：

- 首轮探测命令。
- 任务开始前读取 `context`。
- 通过 `check` 判断知识库健康。
- 通过 `propose` 和 `remember` 生成 proposal。
- 禁止执行 `project-atlas apply`。
- MCP 只使用安全工具。
- 输出模板必须包含读取到的知识文件、健康问题和 apply 状态。

## 安全边界

本轮没有改变运行时安全边界。Agent 仍然不能直接 apply。没有 `knowledge/manifest.json` 时，文档要求 agent 不要静默初始化项目，而是提示用户明确授权。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/mcp.js --help
```
