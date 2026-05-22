# 快速开始

先用最短路径跑通 Project Atlas。OpenCode 用户请直接看专属文档。

[English](en/quick-start.md) | [简体中文](quick-start.md)

这份文档给第一次接触 Project Atlas 的用户。它只保留 CLI 最短路径，不再承载完整 OpenCode 教程。

如果你在 OpenCode 里使用 Project Atlas，直接看 [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)。

如果你要接入其他 agent 或 MCP 客户端，先看 [Agent 快速接入](agent-quickstart.md)。

---

## CLI 最短路径

跑完这页之后，你会完成这些动作：

1. 初始化 `knowledge/`
2. 读取一份项目上下文
3. 生成一份知识更新 proposal
4. 查看 review 摘要
5. 知道为什么 `apply` 只能人工执行

### 1. 在当前仓库直接试

先在本仓库安装和构建：

```bash
npm install
npm run build
```

然后用构建产物跑最小流程：

```bash
node dist/index.js init --repo /tmp/project-atlas-demo --template generic-service
node dist/index.js context --repo /tmp/project-atlas-demo --query demo --budget 8000 --format json
node dist/index.js propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-atlas-demo
node dist/index.js check --repo /tmp/project-atlas-demo --format json
```

### 2. 作为 npm 包使用

发布后或在本地已安装 npm 包时，可以直接使用正式命令：

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

最短命令流如下：

```bash
project-atlas init --repo /path/to/repo --template generic-service
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
project-atlas review-summary --repo /path/to/repo
```

初始化会创建：

- `knowledge/`
- `knowledge/project/overview.md`
- `knowledge/manifest.json`
- `.project-atlas/proposals/`

准备 `updates.json` 时，最小格式如下：

```json
{
  "source_files": ["README.md"],
  "updates": [
    {
      "target": "knowledge/project/overview.md",
      "content": "# Project Overview\n\nWrite verified project knowledge here.\n"
    }
  ]
}
```

review 摘要会帮助你快速看清 proposal id、source files、target files、dry-run 摘要、review decision 和 apply safety。

## 人工 apply 边界

真实写入必须回到终端，由人执行：

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

原因很简单。Project Atlas 允许 agent 读上下文和生成 proposal，但不允许模型直接写项目知识库。

## 下一步看什么

- 在 OpenCode 里使用
  看 [OpenCode 使用文档](../../adapters/opencode/README.zh-CN.md)
- 想接入其他 AI agent
  看 [Agent 快速接入](agent-quickstart.md)
- 想知道什么知识值得沉淀
  看 [最佳实践](best-practices.md)
- 想准备发布当前仓库
  看 [现在发布指南](publish-now.md)
