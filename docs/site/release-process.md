# 发布流程

这份文档说明 Project Atlas 的长期发布规则。它偏治理规则，不替代当前仓库的一次性发包步骤。

如果你现在就要发包，直接看 [现在发布指南](publish-now.md)。

## 版本规则

Project Atlas 使用 SemVer：

- `MAJOR`
  不兼容的 CLI、schema 或 evidence 格式变化
- `MINOR`
  新增命令、参数、schema 字段或 adapter 能力
- `PATCH`
  bug 修复、文档修正和不改变行为的维护

当前公开 schema 版本是 `1.0`。只补文档描述时不用升级 schema 版本。不兼容字段变化时必须升级 schema 版本，并在 changelog 里写清迁移方式。

## 发布前要更新什么

每次发布前都要确认：

- `package.json` 版本号
- `CHANGELOG.md`
- 文档里的命令名和安全边界
- `README.md` 和 `docs/site/` 的入口链接

如果本次版本改动了 CLI 行为、schema、MCP 工具范围或安全边界，changelog 里要单独写清。

## 发布前固定验证

发布前固定执行：

```bash
npm run lint:types
npm test
npm run verify
npm pack --dry-run
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

通常不应包含：

- `test/`
- `src/`
- `docs/development-log/`
- `node_modules/`

## 发布步骤

推荐顺序如下：

1. 更新版本号和 `CHANGELOG.md`
2. 创建并推送发布提交
3. 执行 `npm run release:verify`
4. 执行 `npm run release:npm`

如果脚本不可用，再回退到手工命令流程。

## 发布后检查

发布完成后，再确认这些点：

- `npm view project-atlas version`
- `npm view project-atlas dist-tags`
- `npm install -g project-atlas`
- `project-atlas --help`
- `project-atlas-mcp --help`

## 文档同步规则

只要本次发布改动了入口体验，就要一起检查：

- 根 `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`
- `docs/site/quick-start.md`
- `docs/site/en/quick-start.md`
- `docs/site/agent-quickstart.md`
- `docs/site/en/agent-quickstart.md`

Project Atlas 的发布不仅是代码发布，也是使用方式和安全边界的发布。
