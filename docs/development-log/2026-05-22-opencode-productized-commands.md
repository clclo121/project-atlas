# 2026-05-22 OpenCode 产品化命令优化记录

## 背景

前两轮已经补齐 `/kb-generate`、`/kb-check` 和 `/kb-review`。继续梳理后确认，当前不适合新增 `/kb-complete`。这个命令容易让模型无证据铺满知识库目录。更合适的方向是补一个状态入口和一个项目记忆入口。

## 实现过程

1. 新增 `/kb-status` 命令模板。
2. 新增 `/kb-remember` 命令模板。
3. 新增 `project_atlas_remember` OpenCode tool。
4. 抽出 `adapters/opencode/lib/run_project_atlas.js`，复用 Project Atlas 命令执行逻辑。
5. 将已有 OpenCode tool 改为使用共享 helper。
6. 优化 `/kb-refresh`，增加来源文件、质量规则和无稳定变化时的停止规则。
7. 优化 `/kb-context`，补充 query、source file 和 memory type 三种读取方式。
8. 优化 `/kb-review`，补充没有 latest proposal 时的说明。
9. 修正 `/kb-generate` 中 `sourceFiles` 的表达，明确它是 proposal 级来源集合。
10. 更新 OpenCode README、skill 和需求文档。

## 命令定位

`/kb-status` 用于快速查看知识库健康状态和 latest proposal 状态。如果当前没有待 review proposal，命令要求明确说明“当前没有待 review proposal”。

`/kb-remember` 用于把稳定决策、经验和项目事实生成 project memory proposal。它不能读取聊天记录当作来源，必须绑定 repo 内 source files。

## 安全边界

本轮仍然不新增 CLI 子命令和 MCP tool。OpenCode adapter 继续只提供安全读、检查、review 和 proposal 能力，不提供 apply。

## 发布前审查记录

发布前复查时补了两个实现细节：

1. `project_atlas_context` 需要真正接收并传递 source file、memory type、topic、scope 和 format 参数，避免命令模板写了读取建议但 tool 只能按 query 读取。
2. `project_atlas_review_summary` 需要区分没有 proposal、真实命令失败和不可 apply 的 proposal。只有 review summary 明确显示 `can_apply: yes` 时，才追加人工终端 apply 提醒。

npm registry 上已经存在 `0.1.1`，本轮发布前将 package 版本升到 `0.1.2`。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
```
