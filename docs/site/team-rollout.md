# 团队落地流程

Project KB 的团队落地建议从一个项目开始，不要一开始就要求所有项目统一迁移。

## 第一步 选择试点项目

优先选择这些项目：

- 团队经常问重复问题。
- 业务流程相对稳定。
- README 或开发日志已经有基础资料。
- 最近会有真实需求进入开发。

## 第二步 初始化知识库

由项目负责人执行：

```bash
project-kb init --repo /path/to/repo --template generic-service
```

Java 后端、前端项目可以选择对应模板。

## 第三步 建立协作规则

建议团队约定：

- 需求开始前，agent 先读 `project-kb context`。
- 需求结束后，只更新确实稳定的知识。
- 所有知识更新先走 `project-kb propose`。
- reviewer 先读 `project-kb review-summary`。
- 只有人能执行终端 apply。

## 第四步 接入 agent

本地 agent 可以选一种方式：

- 直接调用 `project-kb` CLI。
- 使用 OpenCode adapter。
- 使用 `project-kb-mcp` 接入 Claude Code、Cursor 或 Continue。

所有 adapter 都保持同一条安全边界。agent 可以生成 proposal，不能直接写入知识库。

## 第五步 固定检查点

建议在这些节点检查知识库：

- 新需求完成。
- 发布前。
- 新同事接手项目。
- 关键接口或流程调整后。

团队落地的目标不是文档越多越好，而是让可复用知识保持可信。
