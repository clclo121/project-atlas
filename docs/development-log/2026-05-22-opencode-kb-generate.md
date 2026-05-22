# 2026-05-22 OpenCode kb-generate 适配记录

## 背景

本轮目标是补齐 OpenCode 首次生成知识正文的快捷命令。之前已经提供了 `project_atlas_scan`、`project_atlas_context`、`project_atlas_propose` 三个安全工具，以及 `/kb-context` 和 `/kb-refresh` 两个命令模板。

用户反馈当前适配仍偏底层。OpenCode 里还缺一个可以直接输入的首次生成命令。该命令不能回到旧的 `opencode-kb-*` 实现，也不能绕过 Project Atlas 的 proposal 机制。

## 实现过程

1. 新增 `/kb-generate` 命令模板。
2. 命令固定要求调用 `project_atlas_scan`，并使用 `mode=full`。
3. 当 `knowledge/manifest.json` 不存在时，命令要求停止生成，并提示用户先执行 `project-atlas init`。
4. 正文生成范围采用核心加候选策略。
5. 命令固定生成项目概览和术语表。
6. domains、workflows、integrations、quality 只在 scan 结果有候选或明确证据时生成。
7. contracts 和 decisions 没有直接证据时不生成。
8. 每篇正文都必须绑定 `sourceFiles`，并通过 `project_atlas_propose` 生成 proposal。
9. 命令明确禁止写 frontmatter，由 Project Atlas 在 proposal 阶段统一补元数据和来源 hash。
10. 命令继续禁止 apply，真实写入仍要求人工回到终端执行。

## 质量边界

- 只写源码、README、配置文件名和 scan 输出能证明的事实。
- 不写泛泛介绍。
- 不写营销文案。
- 不写推测。
- 不写 secret、token、password、access key 等敏感值原文。
- 标题必须和目标文件职责一致。
- 内容需要包含职责、关键入口、关键文件、使用或变更注意点。

## 安全边界

本轮没有新增 CLI 子命令、MCP tool 或 OpenCode JS tool。OpenCode adapter 仍然只暴露 scan、context、propose 三类安全能力。`/kb-generate` 只是命令模板，不能直接写 `knowledge/**`，也不能执行 apply。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
```
