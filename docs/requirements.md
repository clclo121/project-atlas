# project-atlas 需求文档

## 1. 产品定位

`project-atlas` 是面向 AI Coding Agent 和人类研发团队的项目知识库治理 CLI。

它不定位为某一个 Agent 的插件。OpenCode 只是第一套适配示例。核心产品是 `project-atlas` CLI、知识库目录规范、证据协议和人工确认写入流程。

一句话定位：

> 让项目知识变成可提交、可审查、可追溯、可被 AI 稳定读取的仓库资产。

## 2. 要解决的问题

### 2.1 AI 重复读取项目

AI 每次进入项目都重新搜索 README、源码、配置和历史文档，浪费 token，也容易漏掉关键上下文。

`project-atlas` 通过 `context` 生成紧凑上下文包，让 AI 先读经过治理的项目知识，再按需要查源码。

### 2.2 跨会话上下文丢失

AI 会话结束后，需求背景、业务规则、接口边界和排障经验容易散落在聊天记录里。

`project-atlas` 把长期有效知识沉淀到 `knowledge/`，跟随 Git 一起保存和评审。

### 2.3 自动生成文档不可信

自动文档如果没有来源文件、hash、proposal 和审查结果，团队很难判断它是不是编造出来的。

`project-atlas` 要求知识文档包含 frontmatter，记录 `source_files`、`source_hashes`、`generated_by` 和 `review_status`。

### 2.4 自动写入存在风险

如果模型可以直接写入知识库，就可能把错误结论、敏感配置或未确认内容写进仓库。

`project-atlas apply` 必须在终端 TTY 下人工确认。Agent 适配层不提供 apply tool。

### 2.5 知识库缺少审查流程

团队需要知道本轮为什么要更新知识库、改了哪些文件、引用了哪些来源、是否命中敏感阻断、是否存在过期知识。

`project-atlas review-summary` 生成面向 reviewer 的 Markdown 摘要，减少人工读 JSON 的成本。

## 3. 目标用户

- 使用 AI Coding Agent 的后端、前端、测试和平台研发人员。
- 需要维护项目知识库的团队技术负责人。
- 需要判断知识库是否可信、是否需要更新的 reviewer。
- 想把项目上下文沉淀为 Git 资产的开源项目维护者。

## 4. 使用场景

### 4.1 首次接入项目知识库

用户在 Git 项目中执行：

```bash
project-atlas init --repo <repo>
```

系统创建 `knowledge/` 骨架和 `.project-atlas/proposals/` 本地证据目录，并把 `.project-atlas/` 写入 `.gitignore`。

### 4.2 AI 开始任务前读取上下文

用户或 Agent 执行：

```bash
project-atlas context --repo <repo> --query <topic> --budget 8000
```

系统按进行中规格、归档规格、知识库的顺序输出上下文包，并保留来源路径。

### 4.3 任务完成后判断是否需要沉淀

用户或 Agent 执行：

```bash
project-atlas scan --repo <repo> --mode changed
project-atlas stale --repo <repo>
```

系统输出本轮变更文件、候选知识目标、敏感配置摘要和过期知识状态。

### 4.4 生成知识库更新 proposal

用户或 Agent 执行：

```bash
project-atlas propose --repo <repo> --updates-file updates.json --reason "新增订单规则"
```

系统只生成 proposal 证据，不直接写 `knowledge/**`。

### 4.5 人工确认写入

用户在终端执行：

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```

系统要求 TTY 确认，并在确认后再次校验 worktree hash 和目标文件 hash。

用户也可以在终端批量处理仍处于 proposed 状态的 proposal：

```bash
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```

批量写入仍然要求 TTY 人工确认，不提供给 agent 或 MCP 自动调用。

### 4.6 reviewer 审查知识库更新

用户执行：

```bash
project-atlas review-summary --repo <repo> --proposal-id <id>
```

系统输出本次 proposal 的人类可读摘要。

## 5. 功能需求

### 5.1 `init`

- 必须只支持 Git 仓库。
- 必须创建 `knowledge/` 标准目录。
- 必须创建 `knowledge/logs/` 和 `knowledge/assets/` 目录。
- 必须创建 `knowledge/project/overview.md`。
- 必须创建 `knowledge/manifest.json`。
- 必须创建 `.project-atlas/proposals/`。
- 必须在 `knowledge/index.md` 提供 `logs/` 和 `assets/` 目录入口。
- 必须把 `.project-atlas/` 和 `knowledge/**/*.kbtmp.*` 写入 `.gitignore`。
- 已存在文件不得覆盖。

### 5.2 `scan`

- 必须支持 `--mode full` 和 `--mode changed`。
- 必须输出 JSON。
- 必须输出 Git 基准提交和 `worktree_diff_hash`。
- 必须识别 Maven 项目信息。
- 必须识别常见 Java 入口，包括 controller、service、feign、tasks、mq、remote、config。
- 必须列出 `knowledge/` 覆盖情况。
- 必须对敏感配置只输出规则类型和文件路径，不输出原文值。
- 支持通过 `--external-evidence-file` 导入外部代码证据。
- 不把外部代码图谱工具作为运行时硬依赖。

### 5.3 `context`

- 默认输出 Markdown。
- 必须支持 `--format json`。
- 必须支持 `--budget` 限制上下文长度。
- 来源优先级固定为进行中规格、归档规格、`knowledge/`。
- 输出必须保留来源路径。

### 5.4 `stale`

- 必须读取知识文档 frontmatter。
- 必须根据 `source_files` 和 `source_hashes` 判断知识是否过期。
- 必须区分 `fresh`、`stale`、`missing_source`、`missing_metadata`。
- 必须支持 Markdown 和 JSON 输出。

### 5.5 `propose`

- 必须支持单文件 proposal。
- 必须支持多文件 proposal。
- target 必须位于 `knowledge/**`。
- 禁止通过 proposal 修改 `knowledge/manifest.json`。
- 禁止通过 proposal 写入 `knowledge/assets/**`。
- 必须写入 `proposal.json`、`trigger-result.json`、`latest.json` 和 `dry-run.diff`。
- 必须支持保存外部代码证据。
- 命中敏感规则时，proposal 状态必须为 `blocked_sensitive`，并且不能保存敏感原文。

### 5.6 `apply`

- 必须要求 `--confirm`。
- 必须要求终端 TTY。
- 必须支持 `--proposal-id <id>` 单个写入。
- 必须支持 `--all` 批量写入 proposed proposal。
- 必须支持 `--all --yes-all` 一次确认后批量写入。
- `--proposal-id` 和 `--all` 必须二选一。
- 人工确认输入只接受 `y` 和 `n`。
- TTY 确认前不得写入目标知识文件。
- 确认后必须重新校验 `worktree_diff_hash`。
- 确认后必须重新校验目标文件当前 hash。
- 写入必须使用同目录 `.kbtmp` 临时文件。
- 写入完成后必须更新 proposal 状态和 `applied_hash`。

### 5.7 `review-summary`

- 必须输出 Markdown。
- 必须包含 proposal id、状态、原因、source files、target files、外部证据、敏感扫描结果、stale 状态和下一步命令。
- 默认读取 `latest.json`。
- 支持通过 `--proposal-id` 指定 proposal。

### 5.8 OpenCode adapter

- 只作为示例适配层。
- 只能提供 `scan`、`context`、`propose`、`remember`、`check`、`review-summary` 相关安全工具。
- 可以提供面向用户的命令模板，例如 `/kb-context`、`/kb-refresh`、`/kb-generate`。
- 可以提供 `/kb-check` 和 `/kb-review`，用于 proposal 生成后的健康检查和审核摘要。
- 可以提供 `/kb-status`，用于聚合知识库健康状态和 latest proposal 状态。
- 可以提供 `/kb-remember`，用于沉淀决策、经验和项目事实类 project memory proposal。
- `/kb-generate` 只能作为 Project Atlas adapter 命令，用 `mode=full` 扫描结果生成首批知识正文 proposal。
- `/kb-generate` 必须按 `knowledge/` 结构生成，默认采用核心加候选策略，不允许无证据铺满所有目录。
- `/kb-generate` 生成的每篇正文必须绑定来源文件，并且必须通过 `project_atlas_propose` 进入 proposal。
- OpenCode adapter 在生成长正文时必须优先使用文件输入，例如 `updatesFile` 或 `target + contentFile`。
- OpenCode adapter 不应把长中文 Markdown 正文直接放进 tool JSON 参数。
- 不允许提供 apply tool。
- 必须提示用户真实写入要回到终端执行。

### 5.9 MCP 和其他 adapter

- `project-atlas-mcp` 只提供本地 stdio MCP server。
- MCP 只能暴露 `scan`、`context`、`stale`、`propose`、`review-summary`。
- MCP 不允许暴露 apply tool。
- Claude Code、Cursor、Continue adapter 只作为示例说明。
- 所有 adapter 的真实写入都必须回到终端执行。

## 6. 非目标

- 第一版不做 Web UI。
- 第一版不做远程 HTTP MCP server。
- 第一版不做语义检索。
- 第一版不做代码知识图谱。
- 第一版不做多 Agent 深度适配。
- 第一版不做云端同步。
- 第一版不做自动 apply。
- 第一版不承诺生成高质量长文档，只提供治理框架和证据协议。

## 7. 安全要求

- 敏感配置不得输出原文值。
- 模型工具不得直接写 `knowledge/**`。
- `.project-atlas/` 默认不提交 Git。
- proposal target 必须做路径边界校验。
- apply 必须由人工在 TTY 确认。
- 写入前后必须做 hash 校验。

## 8. 验收标准

- `npm run lint:types` 通过。
- `npm run build` 通过。
- `npm test` 通过。
- 测试覆盖初始化、扫描、上下文包、过期检测、proposal、安全阻断、TTY apply 和 review summary。
- README 能说明项目定位、命令和边界。
- 开发日志记录实现范围、验证命令和当前未做能力。
