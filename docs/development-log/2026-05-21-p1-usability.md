# 2026-05-21 project-kb-core P1 可用性增强记录

## 本轮目标

- 只收口 `docs/remaining-tasks.md` 中的 P1 项。
- 不开发 MCP server、多 Agent adapter、外部代码证据接入、CI、发布流程和文档站点。
- 保持安全边界不变。`apply` 仍然只能由人工在终端 TTY 确认后执行。

## 实现过程

1. 先确认基线。
   - 当前分支为 `main`，跟踪 `origin/main`。
   - `npm test` 基线通过，原有 10 个用例全部通过。

2. 先补失败测试。
   - 新增 `context --query "order payment"` 多关键词测试。
   - 新增 `context --source-file README.md` 来源反查测试。
   - 新增 JSON context pack 的 `source_type`、`truncated` 和 `budget_used` 测试。
   - 新增 stale 建议、review-summary dry-run 摘要和 apply safety 测试。
   - 新增 `propose --inherit-source-metadata` 显式继承测试。
   - 新增 `init --template` 三种模板、非法模板和不覆盖已有文件测试。

3. 实现 context 增强。
   - `--query` 支持多个关键词，默认任一关键词命中即可返回。
   - 新增 `--source-file`，只反查 `knowledge/**/*.md` 的 frontmatter `source_files`。
   - context item 增加 `source_type`，区分 `openspec_change`、`openspec_spec` 和 `knowledge`。
   - JSON 输出增加 `truncated` 和 `budget_used`。

4. 实现 stale、propose 和 review-summary 增强。
   - stale item 增加 `suggestion`。
   - Markdown stale report 输出 `Suggestion`。
   - `propose --inherit-source-metadata` 显式合并目标知识文件的旧 `source_files`。
   - review summary 增加 `Dry Run Summary`、`Review Decision` 和 `Apply Safety`。

5. 实现 init template。
   - `init --template` 支持 `generic-service`、`java-backend` 和 `frontend-app`。
   - 默认模板为 `generic-service`。
   - 模板只调整初始说明和示例问题，不改变目录结构。
   - 已有知识文件仍然不覆盖。

6. 补发布资产。
   - 新增 `templates/generic-service/README.md`。
   - 新增 `templates/java-backend/README.md`。
   - 新增 `templates/frontend-app/README.md`。
   - `package.json` 的 `files` 增加 `templates`。
   - `schema/context-pack.schema.json` 同步新增 P1 JSON 字段。

## 验证命令

本轮收口需要执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
```

## 未纳入本轮

- 不做 MCP server。
- 不做 Claude Code、Cursor、Continue adapter。
- 不做外部代码证据接入。
- 不做文档站点。
- 不做 GitHub Actions。
- 不做 SemVer 发布流程自动化。
