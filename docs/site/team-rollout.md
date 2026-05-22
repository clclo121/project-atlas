# 团队落地流程

Project Atlas 的团队落地建议从一个项目开始，不要一开始就要求所有项目统一迁移。

## 第一步 选择试点项目

优先选择这些项目：

- 团队经常问重复问题。
- 业务流程相对稳定。
- README 或开发日志已经有基础资料。
- 最近会有真实需求进入开发。

## 第二步 初始化知识库

由项目负责人执行：

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

Java 后端、前端项目可以选择对应模板。

## 第三步 建立协作规则

建议团队约定：

- 需求开始前，agent 先读 `project-atlas context`。
- 需求结束后，只更新确实稳定的知识。
- 所有知识更新先走 `project-atlas propose`。
- 项目记忆先走 `project-atlas remember`，再由人 review。
- reviewer 先读 `project-atlas review-summary`。
- 只有人能执行终端 apply。

## 第四步 接入 agent

本地 agent 可以选一种方式：

- 直接调用 `project-atlas` CLI。
- 使用 OpenCode adapter。
- 使用 `project-atlas-mcp` 接入 Claude Code、Cursor 或 Continue。

所有 adapter 都保持同一条安全边界。agent 可以生成 proposal，不能直接写入知识库。

MCP 里的 `project_atlas_remember` 和 `project_atlas_check` 也是安全工具。前者只生成记忆 proposal，后者只做健康检查。

## 第五步 固定检查点

建议在这些节点检查知识库：

- 新需求完成。
- 发布前。
- 新同事接手项目。
- 关键接口或流程调整后。
- 决策、经验或项目事实被写入记忆前。

建议把 `project-atlas check --repo /path/to/repo --format json` 放进团队本地检查清单。它能在 review 前暴露缺来源、过期来源、坏链接和重复 topic。

团队落地的目标不是文档越多越好，而是让可复用知识保持可信。
