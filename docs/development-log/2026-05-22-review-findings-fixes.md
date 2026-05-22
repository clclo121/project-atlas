# 2026-05-22 审查问题修复记录

## 背景

全项目审查后发现 5 个需要收口的问题：

1. proposal 正文自带 frontmatter 时，可以绕过 Project Atlas 生成的来源元数据。
2. `source_files` 可以指向不存在的文件，后续 hash 会被记录为 `sha256:missing`。
3. `context --format json` 的 `items[].content` 没有共享预算，输出体积可能明显超过 `--budget` 的直觉含义。
4. `blocked_sensitive` proposal 仍会打印 apply 命令，容易误导用户。
5. README 和中英文 Quick Start 的最短路径缺少 `git init`、`README.md` 和 `updates.json` 创建步骤。

## 测试先行

先在 `test/cli.test.mjs` 中补充失败测试：

1. 多关键词 context 使用小预算时，断言所有 `items[].content` 共享全局预算。
2. `propose --updates-file` 的 `source_files` 指向缺失文件时必须失败。
3. proposal 正文自带 frontmatter 时必须失败，并且不能输出 apply 命令。
4. 敏感内容导致 `blocked_sensitive` 时，不输出 `apply: project-atlas apply`，改为输出 review-summary 提示。
5. `remember --candidate-file` 的 `source_files` 指向缺失文件时必须失败。
6. `remember --format json` 生成 blocked proposal 时，不返回 `apply_command`，返回 `review_command`。
7. README 和中英文 Quick Start 必须包含 `git init`、`README.md` 和 `updates.json`。

首次运行相关测试时，失败集中在预算、缺失来源文件和文档示例，证明测试覆盖到了问题。

## 实现调整

1. `src/frontmatter.ts` 新增 `hasFrontmatter`，支持 LF 和 CRLF frontmatter 检测。
2. `cmdPropose` 在创建 proposal 前拒绝自带 frontmatter 的正文，错误信息固定为 `proposal content must not include frontmatter; project-atlas generates metadata automatically.`。
3. `createProposal` 在计算 source hash 前检查所有 `source_files`，缺失或不是普通文件时报 `source file does not exist: <path>`。
4. `cmdContext` 的 JSON 输出改为通过 `budgetContextItems` 给 `items[].content` 按顺序分配同一份预算。
5. `cmdPropose` 和 `cmdRemember` 只在 `proposal_status` 为 `proposed` 时输出 apply 命令。其他状态输出 review-summary 命令。
6. README 和中英文 Quick Start 的本地最短路径补齐临时 Git 仓库初始化、README 创建和 updates.json 创建。

## 验证

本轮需要执行：

```bash
npm run build
npm run verify
npm run pack:dry-run
```

验证结果以本轮最终命令输出为准。
