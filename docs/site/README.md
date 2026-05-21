# Project KB 文档

这里是 `project-kb-core` 的轻量文档入口。文档保持 Markdown 形态，方便直接在 GitHub、编辑器或团队知识库里阅读。

## 推荐阅读顺序

1. [快速开始](quick-start.md)
2. [最佳实践](best-practices.md)
3. [团队落地流程](team-rollout.md)
4. [安全 FAQ](security-faq.md)
5. [发布流程](release-process.md)

## 10 分钟体验路径

```bash
npm install
npm run build
node dist/index.js init --repo /tmp/project-kb-demo
node dist/index.js context --repo /tmp/project-kb-demo --query demo
node dist/index.js propose --repo /tmp/project-kb-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-kb-demo
```

真实写入仍然要由人回到终端执行：

```bash
node dist/index.js apply --repo /tmp/project-kb-demo --proposal-id <id> --confirm
```

Project KB 的核心边界是清楚的。Agent 可以读取上下文和生成 proposal，不能直接 apply。
