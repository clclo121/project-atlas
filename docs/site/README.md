# Project Atlas 中文文档

少看全仓，多读可信项目知识。

[English](en/README.md) | [简体中文](README.md)

Project Atlas 是一个 Git 优先的项目知识库治理 CLI，面向开源项目维护者、工程团队和 AI 编程 agent。它把长期有效的项目知识沉淀到 `knowledge/`，把知识更新先变成 proposal，再由人审核并在终端确认写入。

AI 工具很容易在每次任务里重复扫描大量源码，也容易把稳定项目事实留在聊天记录里。Project Atlas 用仓库内知识库、可审核 proposal 和人工 apply 边界，把这些问题收回到可维护范围内。

---

## 快速开始

先跑最短路径：

```bash
npm install
npm run build
node dist/index.js init --repo /tmp/project-atlas-demo --template generic-service
node dist/index.js context --repo /tmp/project-atlas-demo --query demo --budget 8000 --format json
node dist/index.js propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-atlas-demo
```

如果已经安装 npm 包，直接使用正式命令：

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

这条路径会让你从初始化仓库，走到读取上下文和生成可审核知识更新。

---

## 为什么用 Project Atlas

Project Atlas 适合这些场景：

- 新用户想快速知道这个工具能解决什么问题
- 团队想让 AI 先读可信项目知识，再去翻源码
- reviewer 想看清知识变更来源，而不是直接读一大段自动生成文档
- 维护者想把项目事实、决策和经验沉淀成 Git 资产

核心边界也很明确：

- agent 可以读取上下文、检查健康状态、生成 proposal
- agent 不能直接执行 `project-atlas apply`
- 真正写入 `knowledge/**` 仍然必须由人在终端确认

---

## 它怎么工作

最常见的使用顺序如下：

1. 用 `init` 建立知识库骨架
2. 用 `context` 读取治理后的项目上下文
3. 用 `propose` 或 `remember` 生成可审核的知识更新
4. 用 `review-summary` 先看摘要
5. 由人在终端执行 `apply`

---

## 从哪里开始

按你的目标选择入口：

- 现在就试用
  看 [快速开始](quick-start.md)
- 在 OpenCode 中使用
  看 [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)
- 接入 AI agent
  看 [Agent 快速接入](agent-quickstart.md)
- 准备发布当前仓库
  看 [现在发布指南](publish-now.md)

---

## 文档地图

- [快速开始](quick-start.md)
  只保留 CLI 最短路径，并分流到 OpenCode 专属文档
- [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)
  OpenCode 用户主入口，覆盖首次生成、增量刷新、review 和 memory
- [Agent 快速接入](agent-quickstart.md)
  给通用 agent 和工具接入方的执行协议
- [最佳实践](best-practices.md)
  说明什么知识适合写进知识库，什么不适合
- [团队落地流程](team-rollout.md)
  说明团队从试点到稳定使用的顺序
- [安全 FAQ](security-faq.md)
  说明为什么 apply 必须人工执行，敏感信息如何处理
- [发布流程](release-process.md)
  说明长期版本治理和发布规则
- [现在发布指南](publish-now.md)
  说明这个仓库当前可以直接执行的发包步骤

如果你希望先看命令，再读完整说明，直接打开 [快速开始](quick-start.md)。
