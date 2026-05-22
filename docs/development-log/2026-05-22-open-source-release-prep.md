# 2026-05-22 开源发布准备记录

## 背景

本轮目标是继续 Project Atlas 的开源发布流程。用户已经准备好 npm 账号，所以发布流程从本地文档收口、GitHub 公开、npm 发布和 tag 准备继续推进。

## 实现过程

1. 检查当前 Git 状态，确认本地 `main` 跟踪 `origin/main`，但仍有中英文文档和 agent 文档改动未提交。
2. 检查 npm 登录状态，确认当前 npm 用户为 `oldsixer166`。
3. 检查 GitHub 仓库状态，确认 `clclo121/project-atlas` 仍为 private。
4. 将 `CHANGELOG.md` 的发布内容归入 `0.1.0 - 2026-05-22`，避免 npm 发布后仍把当前能力放在 Unreleased 下。
5. 新增 `CONTRIBUTING.md`，记录本地开发、验证、PR 和发布规则。
6. 新增 `SECURITY.md`，记录安全报告方式和 agent 不可 apply 的安全边界。
7. README 增加开源协作和安全文档入口。

## 发布边界

本轮不会自动绕过 npm 登录、两步验证或 npm 的发布确认。如果 `npm publish` 需要 OTP，应按 npm CLI 提示输入。

## 验证计划

```bash
npm run verify
npm pack --dry-run
node dist/index.js --help
node dist/mcp.js --help
git diff --check
```
