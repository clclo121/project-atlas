# Project Atlas 文档

这里是 `project-atlas` 的轻量文档入口。文档保持 Markdown 形态，方便直接在 GitHub、编辑器、团队知识库或 agent 上下文里阅读。

English documentation is available at [en/README.md](en/README.md).

如果是 agent 接入，不要从长文档开始。直接读 [Agent Quickstart](agent-quickstart.md)，然后按里面的命令执行。

## 推荐阅读顺序

1. [Agent Quickstart](agent-quickstart.md)
2. [快速开始](quick-start.md)
3. [最佳实践](best-practices.md)
4. [团队落地流程](team-rollout.md)
5. [安全 FAQ](security-faq.md)
6. [发布流程](release-process.md)
7. [现在发布指南](publish-now.md)

## 10 分钟体验路径

```bash
npm install
npm run build
node dist/index.js init --repo /tmp/project-atlas-demo
node dist/index.js context --repo /tmp/project-atlas-demo --query demo
node dist/index.js propose --repo /tmp/project-atlas-demo --updates-file updates.json --reason "demo update"
node dist/index.js review-summary --repo /tmp/project-atlas-demo
node dist/index.js check --repo /tmp/project-atlas-demo
```

真实写入仍然要由人回到终端执行：

```bash
node dist/index.js apply --repo /tmp/project-atlas-demo --proposal-id <id> --confirm
```

Project Atlas 的核心边界是清楚的。Agent 可以读取上下文和生成 proposal，不能直接 apply。

如果要沉淀项目级记忆，先准备结构化 JSON 候选文件，再生成 proposal：

```bash
node dist/index.js remember --repo /tmp/project-atlas-demo --candidate-file memory.json --reason "capture project memory"
```

项目记忆仍然写入 `knowledge/`。它是团队共享知识，不读取个人聊天记录，也不绕过 review。

准备发布 npm 包时，先看 [现在发布指南](publish-now.md)。它给出当前仓库可直接执行的发布前检查、npm 登录、首次发布、打 tag 和推送步骤。
