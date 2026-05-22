# 2026-05-22 Project Atlas 改名记录

## 背景

本轮目标是把项目正式命名为 Project Atlas。原来的 `project-kb-core` 更像底层包名，不能准确表达当前产品已经包含 CLI、MCP server、adapter、schema、项目记忆和发布文档。

## 实现过程

1. 将 npm 包名改为 `project-atlas`。
2. 将主 CLI 命令改为 `project-atlas`。
3. 将 MCP server 命令改为 `project-atlas-mcp`。
4. 将 MCP 工具名从 `project_kb_*` 改为 `project_atlas_*`。
5. 将本地 proposal 证据目录从 `.project-kb/proposals/` 改为 `.project-atlas/proposals/`。
6. 将 frontmatter 默认 `generated_by` 改为 `project-atlas`。
7. 将 OpenCode adapter 工具文件名改为 `project_atlas_scan.js`、`project_atlas_context.js` 和 `project_atlas_propose.js`。
8. 将 OpenCode skill 目录改为 `adapters/opencode/skills/project-atlas/`。
9. 更新 README、docs/site、adapter 文档、schema title、schema id、测试断言和发布指南。

## 发布检查

实施时已通过 npm registry 查询确认 `project-atlas` 当前未发现同名包，可以按首次发布处理。发布前仍应再次执行：

```bash
npm view project-atlas version
```

如果仍返回 404，说明包名仍可用于首次发布。

## 未纳入范围

- 未重命名本地工作目录。
- 未重命名 GitHub 远端仓库。
- 未创建 GitHub Release。
- 未执行 npm publish。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
npm run verify
node dist/index.js --help
node dist/mcp.js --help
```
