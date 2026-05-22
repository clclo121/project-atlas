# 团队落地流程

Project Atlas 最适合从一个真实项目试点开始，而不是一开始就在所有仓库里同时铺开。

## 第一步 选试点项目

优先选择这些项目：

- 团队经常重复回答同一类问题
- 业务流程相对稳定
- 已经有 README、需求文档或开发日志基础
- 最近会有真实需求进入开发

这样更容易在短时间内看见效果。

## 第二步 初始化知识库

由项目负责人或维护者执行：

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

如果是 Java 后端或前端仓库，改成更贴近项目的模板：

```bash
project-atlas init --repo /path/to/repo --template java-backend
project-atlas init --repo /path/to/repo --template frontend-app
```

## 第三步 约定协作规则

建议团队先约定这几条：

- 需求开始前，agent 先读 `project-atlas context`
- 任务结束后，只更新已经稳定的知识
- 所有知识更新先走 `project-atlas propose`
- 项目记忆先走 `project-atlas remember`
- reviewer 先读 `project-atlas review-summary`
- 只有人能执行终端 `apply`

## 第四步 接入 agent

常见接入方式有三种：

- 直接调用 `project-atlas` CLI
- 使用 `project-atlas-mcp`
- 使用仓库里的示例 adapter

不管哪种方式，都保持同一条边界：

- agent 可以读取上下文
- agent 可以生成 proposal
- agent 不可以直接写知识库

## 第五步 固定检查点

建议在这些时间点检查知识库：

- 新需求完成后
- 发布前
- 新同事接手项目前
- 关键接口或流程调整后
- 写入项目记忆前

建议把这条命令放进团队日常检查清单：

```bash
project-atlas check --repo /path/to/repo --format json
```

它可以提前暴露来源缺失、知识过期、坏链接和重复 topic。

## 第六步 再扩大范围

只有试点项目已经跑顺之后，再复制到更多仓库。复制时优先复用这些东西：

- 统一的 agent 接入说明
- 统一的 review 习惯
- 统一的发布前检查
- 统一的开发日志记录方式

团队落地的重点不是文档数量，而是可信知识的复用效率。
