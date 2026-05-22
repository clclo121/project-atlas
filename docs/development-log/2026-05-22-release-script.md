# 2026-05-22 npm 发布脚本记录

## 背景

用户要求把这轮已经走通的 npm 发布流程固化成仓库内脚本，避免后续每次发布都靠手工敲命令和临时判断。

本轮目标不是改包功能，而是把发布动作收口成可复用脚本，并同步更新文档和测试。

## 设计取舍

这次把脚本落成 `node scripts/release-npm.mjs`，没有写成 shell 脚本，主要有三个原因：

1. 仓库本身就是 Node 项目，维护成本更低。
2. 版本读取、命令退出码处理和发布后校验，用 Node 写更稳定。
3. npm 浏览器认证这类交互流程，直接继承 stdio 就能继续工作，不需要额外包装。

## 脚本范围

脚本默认覆盖正式发布全流程：

1. 检查工作区是否干净
2. 检查当前分支是否为 `main`
3. 检查本地版本是否大于 npm registry 当前版本
4. 检查 `CHANGELOG.md` 是否已有当前版本章节
5. 执行发布前验证命令
6. 必要时先推送 `origin/main`
7. 执行 `npm publish`
8. 做发布后 registry 校验
9. 可选执行全局安装 smoke check
10. 创建并推送版本 tag

## 参数设计

脚本目前提供三个参数：

- `--verify-only`
  只做检查，不真正发布
- `--skip-global-install-check`
  跳过全局安装和 CLI help smoke check
- `--skip-tag`
  发布成功后不自动打 tag

这三项足够覆盖当前仓库的实际需求，先不扩成更复杂的参数矩阵。

## 配套改动

### package.json

新增两个 npm scripts：

- `npm run release:verify`
- `npm run release:npm`

### 文档

同步更新：

- `docs/site/publish-now.md`
- `docs/site/en/publish-now.md`
- `docs/site/release-process.md`
- `docs/site/en/release-process.md`

文档口径改成优先使用脚本，手工命令作为兜底说明。

### 测试

在 `test/cli.test.mjs` 里增加这些断言：

- `package.json` 必须暴露 `release:verify` 和 `release:npm`
- `scripts/release-npm.mjs` 必须存在
- 脚本正文必须包含 `npm publish`
- 脚本必须包含 verify-only 入口
- 脚本必须包含 tag push 逻辑

## 实现细节

脚本内部区分了三类命令：

1. 需要完整终端交互的命令
   例如 `npm publish` 和全局安装检查，直接继承 stdio
2. 需要读取输出的命令
   例如读取版本、分支状态和 npm registry 结果
3. 可失败探测命令
   例如查询本地 tag 是否已存在

这样可以避免把所有命令都写成同一种处理方式。

## 验证

本轮执行：

```bash
npm test
```

结果：

- 测试通过

## 结论

这次之后，Project Atlas 的 npm 发布流程已经从“文档步骤”提升成“仓库内脚本 + 文档说明 + 测试约束”三件套。

后续如果还要增强，优先考虑这些方向：

1. 增加 `--tag <name>` 或 prerelease 支持
2. 增加对 GitHub Release 的可选支持
3. 视需要再决定是否加 `npm pkg fix` 自动检查

## 后续收口

二次审查时发现两个发布体验问题。

第一，`release:verify` 会检查 clean worktree，但发布文档原顺序是先改版本和 changelog，再执行 `release:verify`，这会被脚本挡住。现在文档顺序改为先更新版本和 changelog，再创建并推送发布提交，然后执行 `npm run release:verify`。

第二，发布脚本的验证命令里同时跑了 `npm test` 和 `npm run verify`，其中 `verify` 已经包含完整测试。现在保留 `npm run verify`，把打包检查改为 `npm run pack:dry-run`，并补上 `node dist/index.js apply --help`，覆盖新增批量 apply 参数帮助。
