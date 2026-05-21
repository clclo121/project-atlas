# 2026-05-21 project-kb-core 初始抽取记录

## 实现范围

- 新增独立 Node TypeScript CLI，入口为 `project-kb`。
- 实现 `init`、`scan`、`context`、`stale`、`propose`、`apply`、`review-summary`、`cleanup`。
- `knowledge/` 作为可提交知识资产。
- `.project-kb/proposals/` 作为本地证据目录，并写入 `.gitignore`。
- `apply` 保留终端 TTY 人工确认，不提供模型可直接调用的写入工具。
- OpenCode 只提供示例适配层。

## 验证记录

- 已先写 `node:test` 行为测试，再补 CLI 实现。
- 已覆盖初始化、扫描、上下文包、过期检测、proposal、安全阻断、TTY apply 和 review summary。

## 当前边界

- 第一版只支持 Git 仓库。
- 第一版不做 Web UI、MCP server、语义检索、代码图谱和多 agent 全量适配。
- 第一版不自动生成高质量长文档，只提供治理框架和证据协议。

## 需求和待办文档补齐

- 新增 `docs/requirements.md`，把产品定位、问题、场景、功能需求、安全要求和验收标准整理成正式需求文档。
- 新增 `docs/remaining-tasks.md`，按 P0 到 P3 梳理开源发布前、真实项目可用性、开源生态能力和产品治理的剩余待开发项。
- 明确暂不建议开发 Web UI、云端同步、自动 apply、自研语义检索、自研代码图谱和个人长期记忆库。
