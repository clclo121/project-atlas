# 2026-05-21 Review Fixes

## 背景

本轮修复来自当前能力审查中的四个问题：

- `apply` 只校验目标文件和工作区 hash，没有强校验 proposal 生成时的来源事实。
- `review-summary` 只把 `stale` 当作 apply 风险，没有覆盖 `missing_source` 和 `missing_metadata`。
- README 指向 `docs/site/README.md`，但 npm package 的 `files` 没有包含 `docs/site`。
- `npm run verify` 会在 `npm test` 已经构建的基础上再次执行 build。

## 实现过程

先补失败测试，再改实现。

新增测试覆盖：

- proposal 生成后修改并提交 `README.md`，再执行 `apply` 必须失败。
- proposal schema 必须要求 `source_hashes`。
- README 链接到文档站点时，package `files` 必须包含 `docs/site`。
- 非骨架知识文档缺少 frontmatter 时，`review-summary` 必须输出 `can_apply: no`，并显示 `missing_metadata_documents: yes`。

实现调整：

- `Proposal` 增加顶层 `source_hashes`，和 `source_files` 一起保存 proposal 创建时的来源快照。
- `createProposal` 写入 `source_hashes`，`schema/proposal.schema.json` 同步增加 required 字段。
- `apply` 前的 `assertProposalStillFresh` 增加两类校验。
  - 当前 `HEAD` 必须和 proposal 的 `base_commit` 一致。
  - 每个 `source_files` 的当前 hash 必须和 proposal 的 `source_hashes` 一致。
- `review-summary` 的 Apply Safety 增加 `missing_source_documents` 和 `missing_metadata_documents`。
- `review-summary` 对初始化骨架说明文件保持宽容，避免 `knowledge/README.md`、`knowledge/index.md`、各目录 README 这类说明文件阻断正常 proposal。
- `package.json` 的 `files` 增加 `docs/site`，并把 `verify` 简化为 `npm run lint:types && npm test`。
- `docs/site/release-process.md` 更新打包清单，明确 `docs/site` 应进入包，`docs/development-log` 不进入包。

## 验证记录

已执行：

```bash
npm test
```

结果是 20 个测试全部通过。

## 未纳入范围

本轮只修复审查中发现的问题，不新增 Web UI、远程 MCP、自动 apply、GitHub Pages 或 npm publish。
