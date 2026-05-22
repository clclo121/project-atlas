# 快速开始

本文帮助新用户在 10 分钟内跑通 Project Atlas 的最小流程。

## 1. 准备项目

进入一个 Git 仓库，安装并构建：

```bash
npm install
npm run build
```

初始化知识库：

```bash
node dist/index.js init --repo /path/to/repo --template generic-service
```

Java 后端项目可以使用：

```bash
node dist/index.js init --repo /path/to/repo --template java-backend
```

前端项目可以使用：

```bash
node dist/index.js init --repo /path/to/repo --template frontend-app
```

## 2. 读取上下文

按关键词读取紧凑上下文：

```bash
node dist/index.js context --repo /path/to/repo --query "order payment" --budget 8000
```

按来源文件反查知识文档：

```bash
node dist/index.js context --repo /path/to/repo --source-file README.md --format json
```

按项目记忆元数据读取上下文：

```bash
node dist/index.js context --repo /path/to/repo --memory-type decision --topic payment --scope backend --format json
```

## 3. 生成 proposal

准备 `updates.json`：

```json
{
  "source_files": ["README.md"],
  "updates": [
    {
      "target": "knowledge/project/overview.md",
      "content": "# Project Overview\n\nRecord the verified project overview here.\n"
    }
  ]
}
```

生成证据：

```bash
node dist/index.js propose --repo /path/to/repo --updates-file updates.json --reason "refresh overview"
```

## 4. 沉淀项目记忆

如果任务结束后产生了稳定事实、决策或经验，可以准备 `memory.json`：

```json
{
  "schema_version": "1.0",
  "source_files": ["README.md"],
  "memories": [
    {
      "target": "knowledge/decisions/payment-review.md",
      "memory_type": "decision",
      "topic": "payment review",
      "scope": "backend",
      "confidence": 0.9,
      "summary": "Payment review must check duplicate callbacks.",
      "body": "When changing payment callbacks, review duplicate notification handling before changing signature validation."
    }
  ]
}
```

生成记忆 proposal：

```bash
node dist/index.js remember --repo /path/to/repo --candidate-file memory.json --reason "capture payment review memory"
```

`remember` 只生成 proposal，不直接写 `knowledge/`。

## 5. Review 后再写入

查看 review summary：

```bash
node dist/index.js review-summary --repo /path/to/repo
```

确认无敏感阻断、无不该写入的内容后，由人执行：

```bash
node dist/index.js apply --repo /path/to/repo --proposal-id <id> --confirm
```

Project Atlas 不允许 agent 直接 apply。这个边界是工具可控的关键。

## 6. 健康检查

发布前或交接前运行：

```bash
node dist/index.js check --repo /path/to/repo --format json
```

`check` 会检查 manifest、必需文件、frontmatter、source hash、缺失来源、空文档、坏相对链接、重复 topic 和 schema JSON。
