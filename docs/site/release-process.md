# 发布流程

本文约定 Project Atlas 的轻量发布治理方式。当前不做自动发布，也不创建 GitHub Release。

如果你现在就准备发布，先看 [现在发布指南](publish-now.md)。本文偏长期规则，`publish-now.md` 偏本次操作步骤。

## 版本规则

使用 SemVer：

- `MAJOR` 用于不兼容的 CLI、schema 或 evidence 格式变化。
- `MINOR` 用于新增命令、参数、schema 字段或 adapter 能力。
- `PATCH` 用于 bug fix、文档修正和不改变行为的维护。

当前公开 schema 版本为 `1.0`。不兼容 schema 变化必须更新 schema 版本，并在 changelog 中说明迁移方式。

## Changelog

每次发布前更新 `CHANGELOG.md`：

- 新增能力写清楚用户能怎么用。
- 行为变更写清楚影响范围。
- 安全边界变化必须单独说明。
- 依赖和 Node 版本要求变化必须说明。

## 发布前检查

发布前固定执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

`npm pack --dry-run` 应包含：

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `dist/`
- `adapters/`
- `schema/`
- `templates/`
- `docs/site/`
- `package.json`

不应包含：

- `test/`
- `src/`
- `docs/development-log/`
- `node_modules/`

## 发布步骤

当前项目只沉淀手工流程：

1. 更新版本号和 `CHANGELOG.md`。
2. 执行发布前检查。
3. 检查 `npm pack --dry-run` 内容。
4. 确认当前分支干净。
5. 创建提交。
6. 推送到 `origin/main`。
7. 执行 `npm login` 和 `npm whoami`。
8. 执行 `npm publish`。
9. 创建版本 tag 并推送。

首次发布当前包名时可以直接使用：

```bash
npm publish
git tag v0.1.0
git push origin main --tags
```

如果 npm 要求二次验证，按 npm CLI 提示完成一次性验证码输入。

## 当前仓库发布注意事项

- 当前 package name 是 `project-atlas`。
- 当前 package version 是 `0.1.0`。
- 当前 npm registry 未发现同名包，可以按首次发布处理。
- 发布前要确认 `CHANGELOG.md` 中 `Unreleased` 的内容已经归入要发布的版本。
- 如果本地 `main` 领先 `origin/main`，先推送代码，再发布 npm 包。
- 如果 GitHub 仓库还没有改名为 `project-atlas`，先改远端仓库名，或者在发布前把 `package.json` 的 repository URL 改回真实仓库地址。
