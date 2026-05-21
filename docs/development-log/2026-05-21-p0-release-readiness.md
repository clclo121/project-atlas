# 2026-05-21 project-kb-core P0 发布准备记录

## 本轮目标

- 只收口 `docs/remaining-tasks.md` 中的 P0 项。
- 不开发 P1 到 P3 中的 context 质量增强、stale 联动、MCP、CI、发布流程和文档站点。
- 保持核心产品边界不变。`apply` 仍然只能由人工在终端 TTY 确认后执行。

## 实现过程

1. 先确认基线。
   - 当前目录不是 Git 仓库，所以没有创建独立 worktree。
   - `npm test` 基线通过，原有 7 个用例全部通过。

2. 先补失败测试。
   - 新增 CLI 帮助和参数错误测试。
   - 新增 schema 文件结构测试。
   - 新增 proposal 和 trigger result 关键字段测试。
   - 新增 OpenCode adapter 安全烟测，确认没有 apply tool。

3. 实现 CLI 帮助和错误提示。
   - 增加 `project-kb --help`、`project-kb help` 和 `project-kb <command> --help`。
   - 增加命令参数白名单，未知参数直接提示对应 usage。
   - `context` 和 `stale` 对 `--format` 做显式校验。
   - `context` 对 `--budget` 和 `--max-context-chars` 做正整数校验。
   - `hash` 缺少 `--path` 时输出带 usage 的短错误。

4. 补 schema 和发布信息。
   - 新增 `schema/manifest.schema.json`。
   - 新增 `schema/proposal.schema.json`。
   - 新增 `schema/trigger-result.schema.json`。
   - 新增 `schema/context-pack.schema.json`。
   - schema 使用 JSON Schema draft 2020-12，当前版本固定为 `1.0`。
   - `package.json` 增加 MIT license、repository、keywords 和 `schema` 打包入口。
   - 新增 `LICENSE` 和 `CHANGELOG.md`。

5. 补 OpenCode adapter 文档。
   - `adapters/opencode/README.md` 增加安装步骤。
   - 增加最小手工验收清单。
   - 保持 adapter 只提供 scan、context、propose 三类工具。

6. 补 README 发布说明。
   - 增加 schema 版本策略。
   - 增加 OpenCode adapter 接入说明。
   - 增加发布前检查命令和包内容预期。

## 验证命令

本轮收口需要执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
node dist/index.js --help
node dist/index.js context --help
```

## 未纳入本轮

- 不做 P1 的 context pack 质量增强。
- 不做 P1 的 stale 和 review-summary 深度增强。
- 不做初始化模板。
- 不做 MCP server。
- 不做 Claude Code、Cursor、Continue adapter。
- 不做外部代码证据接入。
- 不做文档站点、CI 工作流和发布流程自动化。
