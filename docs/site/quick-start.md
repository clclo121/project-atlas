# 快速开始

这份文档给第一次接触 Project Atlas 的用户。目标是用最短路径跑通一次完整体验。

如果你是 AI agent 接入方，先看 [Agent 快速接入](agent-quickstart.md)。

## 你会得到什么

跑完这页之后，你会完成这些动作：

1. 初始化 `knowledge/`
2. 读取一份项目上下文
3. 生成一份知识更新 proposal
4. 查看 review 摘要
5. 知道为什么 `apply` 只能人工执行

## 方式一 从当前仓库直接试

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

## 方式二 作为 npm 包使用

发布后或在本地已安装 npm 包时，可以直接使用正式命令：

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

初始化仓库：

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

常用模板有三种：

- `generic-service`
- `java-backend`
- `frontend-app`

## 最短成功路径

### 1. 初始化知识库

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

这一步会创建：

- `knowledge/`
- `knowledge/project/overview.md`
- `knowledge/manifest.json`
- `.project-atlas/proposals/`

## 2. 读取上下文

按任务关键词读取紧凑上下文：

```bash
project-atlas context --repo /path/to/repo --query "order payment" --budget 8000 --format json
```

如果你已经知道某个来源文件，也可以按文件反查：

```bash
project-atlas context --repo /path/to/repo --source-file README.md --format json
```

## 3. 生成知识 proposal

先准备 `updates.json`：

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

然后生成 proposal：

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
```

## 4. 查看 review 摘要

```bash
project-atlas review-summary --repo /path/to/repo
```

这里会帮助你快速看清：

- proposal id
- source files
- target files
- dry-run 摘要
- review decision
- apply safety

## 5. 为什么 apply 仍然是人工动作

真实写入必须回到终端，由人执行：

```bash
project-atlas apply --repo /path/to/repo --proposal-id <id> --confirm
```

原因很简单。Project Atlas 允许 agent 读上下文和生成 proposal，但不允许模型直接写项目知识库。

## 下一步看什么

- 想接入 AI agent
  看 [Agent 快速接入](agent-quickstart.md)
- 想知道什么知识值得沉淀
  看 [最佳实践](best-practices.md)
- 想准备发布当前仓库
  看 [现在发布指南](publish-now.md)
