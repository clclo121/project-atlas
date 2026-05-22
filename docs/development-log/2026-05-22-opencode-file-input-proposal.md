# 2026-05-22 OpenCode proposal 文件输入修复记录

## 背景

用户在 OpenCode 里生成知识正文时遇到 `lsym_kb_propose_update` 参数 JSON 解析错误。截图里的正文包含较长中文 Markdown。问题不是中文内容本身错误，而是长正文作为 inline tool JSON 参数传入时，容易被外层工具调用解析失败。

Project Atlas CLI 已经支持 `propose --updates-file` 和 `propose --target --content-file`。因此本轮修复点放在 OpenCode adapter，让正文 proposal 调用优先走文件输入。

## 实现过程

1. 扩展 `project_atlas_propose` OpenCode tool，新增 `updatesFile`、`target`、`contentFile`、`externalEvidenceFile` 和 `inheritSourceMetadata` 参数。
2. 保留现有 inline `updates` 和 `sourceFiles` 能力，只用于短内容兼容。
3. 增加输入模式校验，避免 `updatesFile`、`target + contentFile` 和 inline `updates` 混用。
4. `/kb-generate` 和 `/kb-refresh` 增加文件输入规则，要求多篇或长正文先写临时文件，再调用 `project_atlas_propose`。
5. README 和 requirements 同步说明长中文 Markdown 不应直接放进 tool JSON 参数。

## 安全边界

本轮没有新增 CLI 子命令、MCP tool 或 apply 能力。OpenCode adapter 仍然只生成 proposal。真实写入仍需要人工在终端执行 `project-atlas apply`。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
```

## 后续收口

二次审查时发现一个细节问题。`target + contentFile` 虽然避开了长正文 inline JSON，但如果直接映射到 CLI 的 `--target --content-file`，会丢掉 OpenCode tool 参数里的 `sourceFiles`。这样生成的知识正文没有来源 hash，后续 `check` 会继续报来源元数据问题。

本次补充调整：

1. `target + contentFile` 改为读取 content file 后生成临时 `updates.json`。
2. 临时 `updates.json` 会写入 `source_files: args.sourceFiles || []`。
3. Adapter 统一通过 `project-atlas propose --updates-file` 调用 CLI。
4. 如果调用方同时传 `updatesFile` 和 `sourceFiles`，直接返回错误，要求把来源写进 updates file。
5. `/kb-generate` 和 `/kb-refresh` 已同步说明单文件长正文也必须带 `sourceFiles`。
