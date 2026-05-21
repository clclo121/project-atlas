# 发布流程

本文约定 Project KB 的轻量发布治理方式。当前不做自动发布，也不创建 GitHub Release。

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
4. 创建提交。
5. 推送到 `origin/main`。
6. 由维护者决定是否执行 `npm publish`。

本轮 P3 不执行真实 npm publish。
