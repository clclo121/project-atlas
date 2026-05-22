# OpenCode 使用文档

[English](README.md) | [简体中文](README.zh-CN.md)

这份文档给在 OpenCode 中使用 Project Atlas 的用户。它是 OpenCode 场景下的主入口，覆盖首次接入、首次生成、增量刷新、质量检查、proposal review、项目记忆沉淀和人工 apply 边界。

## 快速上手

### 1. 安装 Project Atlas

```bash
npm install
npm run build
npm link
```

如果你已经全局安装过 npm 包，先确认命令可用：

```bash
project-atlas --help
project-atlas-mcp --help
```

### 2. 复制 OpenCode 适配目录

把这些目录复制到团队使用的 OpenCode 资源路径：

```text
adapters/opencode/lib
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

### 3. 重启 OpenCode

重启 OpenCode，让它重新加载 tools、commands 和 skill。

### 4. 跑首次推荐流程

目标仓库已经存在 `knowledge/manifest.json` 时，直接跑：

```text
/kb-generate
/kb-check
/kb-review
/kb-status
```

这条流程会给你四个结果：

- 基于全量扫描证据生成首批知识 proposal
- 检查知识库健康状态
- 输出最新 proposal 的审核摘要
- 给出最新 proposal 是否适合人工 apply 的状态

## 命令地图

- `/kb-context`
  在大范围搜源码前先读治理后的项目上下文
- `/kb-generate`
  基于 `mode=full` 扫描结果生成首批知识 proposal
- `/kb-refresh`
  基于 `mode=changed` 扫描结果生成增量知识 proposal
- `/kb-check`
  在信任或审核知识前检查健康状态
- `/kb-review`
  查看最新 proposal 的审核摘要和 apply safety
- `/kb-status`
  一次查看知识健康状态和最新 proposal 状态
- `/kb-remember`
  把稳定决策、经验和项目事实沉淀成 project memory proposal

## 高阶用法

### 增量刷新稳定知识

当仓库已经有知识库，且代码变更影响了稳定项目事实时，使用这条流程：

```text
/kb-refresh
/kb-check
/kb-review
/kb-status
```

如果结果明确提示 `No stable knowledge changes found.`，就停在这里，不要为了凑更新强行生成 proposal。

如果你是在刷新已有知识文件，而且需要保留旧的来源范围，可以在终端 proposal 命令里带上：

```bash
project-atlas propose --repo <repo> --updates-file updates.json --reason "<原因>" --inherit-source-metadata
```

### 沉淀决策、经验和项目事实

当任务产出了稳定信息，不适合塞进普通 domain 文档时，使用：

```text
/kb-remember
/kb-review
```

适合沉淀的内容包括：

- 稳定技术决策
- 反复出现的排障经验
- 后续任务会反复复用的项目事实

不要把只存在于聊天里的临时上下文直接写成 memory。每条 memory proposal 都必须绑定真实源码或仓库文件。

### proposal 输入规则

长 Markdown 正文优先走文件输入，不要把长正文直接塞进 inline tool JSON。

统一按这几条来：

- 多文件更新时，先写临时 `updates.json`，再调用 `project_atlas_propose` 的 `updatesFile`
- 单文件长正文时，先写临时 Markdown 文件，再调用 `project_atlas_propose` 的 `target + contentFile`
- 所有生成内容都必须绑定真实 repo 相对路径的 `sourceFiles`
- 不要在同一次调用里混用 `sourceFiles` 和 `updatesFile`。走 `updatesFile` 时，把 `source_files` 写进 `updates.json`

这轮文档统一强调三条稳定规则：

1. 长正文优先走 `updatesFile` 或 `contentFile`
2. 生成内容必须绑定真实 `sourceFiles`
3. OpenCode 只负责生成 proposal，不负责执行写入

### 先 review 再人工 apply

每次 `/kb-generate`、`/kb-refresh` 或 `/kb-remember` 之后，都马上执行：

```text
/kb-review
/kb-status
```

review 结果至少要帮助用户看清这些信息：

- proposal id
- source files
- target files
- dry-run 摘要
- stale 状态
- review decision
- apply safety

## 安全边界

OpenCode 可以读取上下文、扫描仓库、检查知识健康、生成 proposal、查看 proposal 摘要。

OpenCode 不能直接 apply 知识更新。

它没有 apply tool。真正写入仍然必须由人在终端执行：

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```

## 附录 给维护者看的内容

### 适配目录

```text
adapters/opencode/lib
adapters/opencode/tools
adapters/opencode/commands
adapters/opencode/skills
```

### 手工烟测

- 在临时 Git 仓库里运行 `project_atlas_scan`，确认能返回扫描 JSON
- 用小 query 运行 `project_atlas_context`，确认能返回 source paths
- 用 `project_atlas_propose` 对 `knowledge/` 下一个目标文件生成 proposal，确认会产出证据
- 用 `project_atlas_remember` 生成一条 memory proposal，确认只产出 proposal
- 运行 `project_atlas_check`，确认能输出知识库检查结果
- proposal 生成后运行 `project_atlas_review_summary`，确认能输出 apply safety
- 在已初始化的临时项目里运行 `/kb-generate`，确认它会根据 `mode=full` 扫描证据生成首批 proposal
- 在 `/kb-generate` 或 `/kb-refresh` 之后运行 `/kb-check`，确认能报告健康问题
- 在 proposal 生成后运行 `/kb-review`，确认能总结 latest proposal
- 运行 `/kb-status`，确认能同时输出知识健康状态和 latest proposal 状态
- 运行 `/kb-remember`，确认只创建 proposal
- 确认 `/kb-generate` 不会直接写 `knowledge/**`，也不会暴露 apply
- 确认不存在 `project_atlas_apply` tool
- 确认输出会提示用户回到终端执行 `project-atlas apply`
- 确认批量 apply 只作为终端命令出现，不作为 OpenCode tool 出现
