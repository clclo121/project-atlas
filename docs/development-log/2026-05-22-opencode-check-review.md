# 2026-05-22 OpenCode check 和 review 命令补齐记录

## 背景

上一轮已经新增 `/kb-generate`，让 OpenCode 可以按 Project Atlas 结构生成首次知识正文 proposal。用户继续追问生成之后还缺哪些命令。经过梳理，当前缺口不是继续补生成命令，而是补齐 proposal 生成后的健康检查和审核入口。

## 实现过程

1. 新增 `project_atlas_check` OpenCode tool。
2. 新增 `project_atlas_review_summary` OpenCode tool。
3. 新增 `/kb-check` 命令模板。
4. 新增 `/kb-review` 命令模板。
5. 更新 OpenCode README，补充首次接入和日常更新推荐流程。
6. 更新 OpenCode skill，明确 check 和 review-summary 都属于安全能力。
7. 更新需求文档，把 OpenCode adapter 的安全工具范围扩展到 check 和 review-summary。
8. 扩展测试，校验新增 tool、命令模板、README 工作流和 apply 边界。

## 命令定位

`/kb-check` 用于检查知识库健康，重点看 manifest、必需文件、来源元数据、过期来源、缺失来源、坏链接和重复 topic。

`/kb-review` 用于查看 latest proposal 的审核摘要，重点看 source files、target files、dry-run 摘要、stale 状态、review decision 和 apply safety。

## 安全边界

本轮仍然不提供 apply tool。OpenCode 只能读上下文、扫描、生成 proposal、检查健康状态和查看审核摘要。真实写入仍需要人工回到终端执行 `project-atlas apply`。

## 验证计划

```bash
npm run lint:types
npm test
npm pack --dry-run
```
