# 2026-05-22 legacy OpenCode proposal 目录检查

## 背景

在 `platformgoods` 真实项目里，同时出现了 `.opencode/kb-proposals/` 和 `.project-atlas/proposals/` 两个 proposal 目录。

`.project-atlas/proposals/` 是 Project Atlas 当前正式使用的本地 proposal 证据目录。`project-atlas init` 会创建它，`project-atlas propose` 和 `project-atlas apply` 也都围绕它工作。

`.opencode/kb-proposals/` 来自早期 OpenCode 包装命令。它容易让使用者误以为有两套知识库，或者误判哪些 proposal 才是当前正式待审核内容。

## 本轮处理

1. 先增加测试，在临时仓库里创建 `.opencode/kb-proposals/kb-legacy/`。
2. 执行 `project-atlas check --format json`，要求返回 `legacy_opencode_proposals` warning。
3. 执行 Markdown 格式的 `project-atlas check`，要求也能看到同一个 rule。
4. 测试先失败，确认当前实现没有识别旧目录。
5. 在 `checkKnowledge` 中增加最小检查逻辑。
6. 只提示，不删除目录，不迁移 proposal，不修改 `.opencode/` 内容。
7. 执行 `npm run build` 同步 `dist/`。
8. 重新执行目标测试，确认通过。

## 行为说明

当仓库存在 `.opencode/kb-proposals/` 时，`project-atlas check` 会返回 warning。

建议内容是先人工 review 或迁移仍有价值的旧 proposal，然后后续统一使用 `.project-atlas/proposals/`。

这个检查不会影响 `ok` 的错误判断。它只是 warning，所以不会把一个原本健康的知识库判成失败。

## 验证

```bash
npm run build
node --test test/cli.test.mjs --test-name-pattern "check reports project knowledge health issues"
```

结果为 30 个测试全部通过。
