# 快速开始

本文帮助新用户在 10 分钟内跑通 Project KB 的最小流程。

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

## 4. Review 后再写入

查看 review summary：

```bash
node dist/index.js review-summary --repo /path/to/repo
```

确认无敏感阻断、无不该写入的内容后，由人执行：

```bash
node dist/index.js apply --repo /path/to/repo --proposal-id <id> --confirm
```

Project KB 不允许 agent 直接 apply。这个边界是工具可控的关键。
