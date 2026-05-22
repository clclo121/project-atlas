# 2026-05-21 project-atlas P3 治理能力记录

## 本轮目标

- 只收口 `docs/remaining-tasks.md` 中的 P3 项。
- 不开发 Web UI、云同步、自动 apply 或发布自动化。
- 文档站点采用轻量 Markdown 形态，不引入 VitePress 等额外工具链。

## 实现过程

1. 确认基线。
   - 当前分支为 `main`，跟踪 `origin/main`。
   - 实施前执行 `npm test`，17 个用例全部通过。

2. 先补失败测试。
   - 新增 P3 治理资产测试。
   - 校验 `docs/site/` 必要页面存在。
   - 校验 README 链接到 `docs/site/README.md`。
   - 校验 CI workflow 包含 Node 22、24、26，不包含 Node 18 或 20。
   - 校验 CI workflow 包含 lint、build、test 和 pack dry-run。
   - 校验 `package.json` 的 `engines.node`、`verify` 和 `pack:dry-run`。

3. 调整运行基线。
   - `package.json` 的 `engines.node` 从 `>=20` 调整为 `>=22`。
   - 新增 `npm run verify`，统一执行类型检查、构建和测试。
   - 新增 `npm run pack:dry-run`，作为打包预检入口。
   - 同步更新 `package-lock.json`。

4. 增加 CI 工作流。
   - 新增 `.github/workflows/ci.yml`。
   - 触发条件为 `push`、`pull_request` 和 `workflow_dispatch`。
   - 测试矩阵为 Node 22、24、26。
   - CI 执行 `npm ci`、`npm run lint:types`、`npm run build`、`npm test`。
   - 单独增加 package dry run job，执行 `npm pack --dry-run`。

5. 增加轻量文档站点。
   - 新增 `docs/site/README.md`。
   - 新增 `docs/site/quick-start.md`。
   - 新增 `docs/site/best-practices.md`。
   - 新增 `docs/site/team-rollout.md`。
   - 新增 `docs/site/security-faq.md`。
   - 新增 `docs/site/release-process.md`。

6. 补公开文档。
   - README 增加文档入口。
   - README 的发布前检查增加 `npm run verify`。
   - `CHANGELOG.md` 记录 P3 治理能力和 Node engine 变化。
   - `docs/remaining-tasks.md` 将 P3 标记为已完成。

## 验证命令

本轮收口需要执行：

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/mcp.js --help
```

## 未纳入本轮

- 不做 npm publish。
- 不创建 GitHub Release。
- 不启用 GitHub Pages。
- 不做 VitePress 或其他文档站点构建。
- 不增加 macOS 或 Windows CI 矩阵。
