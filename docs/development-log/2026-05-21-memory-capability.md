# 2026-05-21 项目级记忆能力开发日志

## 背景

本轮目标是给 Project Atlas 增加项目级 Git 记忆能力。记忆仍然落在 `knowledge/`，通过 proposal 审查进入仓库，不新增个人长期记忆库，不读取聊天记录，也不允许 agent 或 MCP 自动 apply。

实施前工作区已有未提交的审查修复。本轮按既有改动作为基线继续开发，没有回滚这些改动。

## 实现过程

先扩展测试，再实现功能。

新增测试覆盖这些行为：

- `remember --help` 和 `check --help`。
- 非法参数、非法 `--memory-type`、缺少必填参数。
- `remember` 正常生成 proposal，并写入记忆 frontmatter。
- 目标文件已存在时默认失败，显式传 `--replace-existing` 后允许生成替换 proposal。
- 非法 target、非法 confidence 和缺少关键字段会报短错误。
- `check` 能识别健康知识库、缺 manifest、缺 required file、缺 frontmatter、source stale、missing source、坏相对链接、重复 topic 和 JSON 输出结构。
- `context` 能按 `memory_type`、`topic`、`scope` 过滤，并在 JSON items 中返回 metadata。
- MCP 工具列表新增 `project_atlas_remember` 和 `project_atlas_check`，并确认没有 apply 工具。

第一次运行测试时，新增测试按预期失败，原因是 CLI、schema 和 MCP 工具还没有实现。随后完成实现并再次运行测试，全部通过。

## CLI 变更

新增命令：

```bash
project-atlas remember --repo <repo> --candidate-file <file> --reason <text> [--format markdown|json] [--replace-existing]
project-atlas check --repo <repo> [--format markdown|json]
```

`remember` 读取结构化候选 JSON。候选文件包含：

- `schema_version`
- `source_files`
- `memories`

每条 memory 包含：

- `target`
- `memory_type`
- `topic`
- `scope`
- `confidence`
- `summary`
- `body`
- 可选 `owner`
- 可选 `related_docs`

`remember` 不直接写 `knowledge/`。它把每条 memory 转成 `replace_file` operation，并复用现有 proposal 机制生成证据。默认不允许覆盖已有目标文件，只有显式传 `--replace-existing` 才允许生成替换 proposal。

`check` 面向团队健康检查。Markdown 输出适合人读，JSON 输出适合 agent 和 CI 使用。第一版检查项包括：

- `knowledge/manifest.json` 是否存在并可读。
- manifest 中的 required files 是否存在。
- 非脚手架知识文档是否有 frontmatter 和 `source_files`。
- `source_hashes` 是否和当前来源文件一致。
- 来源文件是否缺失。
- 非脚手架知识文档正文是否为空。
- Markdown 相对链接是否损坏。
- 记忆 topic 是否重复。
- `schema/*.schema.json` 是否为合法 JSON。

## Context 变更

`context` 新增过滤参数：

```bash
project-atlas context --repo <repo> --memory-type decision --topic payment --scope backend --format json
```

只要设置记忆过滤参数，读取范围会收敛到 `knowledge/**/*.md`。JSON 输出的 items 增加 `metadata`，包含 `memory_type`、`topic`、`scope`、`confidence`、`owner` 和 `related_docs`。

## Schema 变更

新增：

- `schema/memory-candidate.schema.json`

更新：

- `schema/context-pack.schema.json`，允许 context item 返回 memory metadata。

schema 版本继续固定为 `1.0`。

## MCP 和 Adapter

MCP 新增两个安全工具：

- `project_atlas_remember`
- `project_atlas_check`

MCP 工具仍然不暴露 apply。`project_atlas_remember` 返回内容会提醒用户回到终端执行人工 apply。

Claude Code、Cursor 和 Continue 的 adapter 文档已同步工具列表。OpenCode adapter 仍然只保留原有 scan、context 和 propose 示例，不新增 apply。

## 文档

已更新：

- `README.md`
- `docs/site/README.md`
- `docs/site/quick-start.md`
- `docs/site/best-practices.md`
- `docs/site/team-rollout.md`
- `docs/site/security-faq.md`
- `docs/site/release-process.md`
- `docs/remaining-tasks.md`
- `CHANGELOG.md`

文档重点说明项目记忆、个人记忆、代码图谱和外部证据的边界。项目记忆是团队共享知识。个人记忆不进入本仓库。代码图谱和外部证据只作为辅助来源，不替代人工 review。

## 验证命令

收口前执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

## 未纳入本轮

- 不做语义向量检索。
- 不接入 Graphiti、Mem0 或其他外部记忆系统。
- 不做自动摘要。
- 不读取聊天记录。
- 不新增个人长期记忆库。
- 不新增自动 apply。
- 不做 append 操作，记忆更新仍然生成完整目标文件替换 proposal。
