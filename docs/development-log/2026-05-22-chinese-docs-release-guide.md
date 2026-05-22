# 2026-05-22 中文文档和发布指南补充日志

## 背景

本轮目标是补齐中文文档，并回答当前如果要发布 npm 包应该怎么做。实施前已确认 npm registry 中没有 `project-atlas` 同名包，可以按首次发布准备。

## 实现内容

1. README 中文化。
   - 把项目定位、命令、知识库结构、项目记忆、外部证据、MCP、adapter、发布检查和第一版边界改成中文说明。
   - 增加 `docs/site/publish-now.md` 入口。
   - 明确当前如果发布，应按首次发布处理。

2. 新增现在发布指南。
   - 新增 `docs/site/publish-now.md`。
   - 记录当前包名、版本、npm 包名可用性、发布前检查、npm 登录、首次发布、发布后验证、tag 和失败处理。
   - 明确当前是非 scoped 包，首次发布使用 `npm publish`。

3. 更新发布流程文档。
   - `docs/site/release-process.md` 增加到 `publish-now.md` 的入口。
   - 补齐发布前 help 命令。
   - 补充手工发布步骤、tag 顺序和当前仓库发布注意事项。

4. 更新文档站点入口。
   - `docs/site/README.md` 增加“现在发布指南”。
   - P3 治理测试把 `publish-now.md` 纳入必要页面。

## 如果现在发布

当前推荐步骤：

```bash
git status --branch --short
git push origin main
npm run lint:types
npm test
npm run verify
npm pack --dry-run
npm login
npm whoami
npm publish
npm view project-atlas version
git tag v0.1.0
git push origin main --tags
```

发布前要先处理 `CHANGELOG.md`。如果发布 `0.1.0`，应把本次要发布的 `Unreleased` 内容归入 `0.1.0`。

## 验证计划

收口执行：

```bash
npm test
npm run lint:types
npm run verify
npm pack --dry-run
```

## 未纳入范围

- 不执行真实 `npm publish`。
- 不创建 GitHub Release。
- 不启用 GitHub Pages。
- 不做自动发布流水线。
