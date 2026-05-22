# 2026-05-22 OpenCode 使用文档整合记录

本轮目标是把现有快速上手和高阶教程收口到 OpenCode 专属文档里，同时把站点里的 `quick-start` 和 `agent-quickstart` 收回到分流入口，不再让用户在多处长文之间来回跳。

## 本轮完成内容

1. 重写 `adapters/opencode/README.md`，把它从示例 README 提升为 OpenCode 英文主文档。
2. 新增 `adapters/opencode/README.zh-CN.md`，作为 OpenCode 中文主文档。
3. 把 OpenCode 教程正文按两层重组。
   - 快速上手
   - 高阶用法
4. 将 `Manual Smoke Test` 留在文末附录，不再和用户教程混排。
5. 改写 `docs/site/quick-start.md` 和 `docs/site/agent-quickstart.md`，只保留 CLI 和通用 agent 的短入口，并明确跳转到 OpenCode 文档。
6. 改写 `docs/site/en/quick-start.md` 和 `docs/site/en/agent-quickstart.md`，保持同样职责。
7. 更新 `docs/site/README.md`、`docs/site/en/README.md` 和根 `README.md` 的入口文案，增加 OpenCode 主文档入口。
8. 重写 `adapters/opencode/commands/` 下七个命令模板的表达顺序，统一成场景、输入规则、成功产物、安全边界。
9. 先修改测试断言，再改文档正文，按红绿流程确认新结构真的被覆盖。

## 关键口径

- OpenCode 用户教程现在以 `adapters/opencode/README.zh-CN.md` 和 `adapters/opencode/README.md` 为主。
- 站点页继续保留，但职责改成导航和分流，不再承载完整 OpenCode 教程正文。
- 高阶内容只覆盖用户高级用法，不展开 adapter 开发细节。
- 所有文档都继续强调 OpenCode 只创建 proposal，不执行 `project-atlas apply`。
- 长正文 proposal 统一强调 `updatesFile`、`contentFile` 和真实 `sourceFiles` 绑定规则。

## 验证重点

1. 新增中文 OpenCode 文档是否存在。
2. 中英文 OpenCode 文档是否都覆盖 `/kb-generate`、`/kb-refresh`、`/kb-check`、`/kb-review`、`/kb-status`、`/kb-remember` 和 `project-atlas apply`。
3. `docs/site/quick-start.md`、`docs/site/agent-quickstart.md` 及其英文页是否都显式跳转到 OpenCode 文档。
4. 命令模板是否还保持原有限制，不引入 apply tool 或旧 `opencode-kb-*` 说法。
