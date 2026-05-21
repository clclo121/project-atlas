# 安全 FAQ

## Agent 能直接写知识库吗

不能。Project KB 的 agent adapter 和 MCP server 都不提供 apply 工具。

Agent 可以：

- scan
- context
- stale
- propose
- remember
- check
- review-summary

Agent 不能：

- 调用 apply tool
- 绕过 proposal 直接写 `knowledge/**`
- 在非 TTY 环境执行 apply

## 为什么 apply 必须在终端执行

`apply` 会真实写入知识文档。Project KB 要求人在终端 TTY 中确认，避免模型在没有人工检查时直接改知识库。

## 敏感内容怎么处理

扫描配置时只输出规则类型和文件路径，不输出真实值。

proposal 命中敏感规则时，状态会变成 `blocked_sensitive`，并且不会保存敏感原文。

## 外部证据安全吗

`external_evidence` 只保存外部工具给出的结构化摘要。它不会运行 Serena、Codebase-Memory、Aider Repo Map 等工具，也不会把这些工具作为依赖。

导入外部证据前，团队仍然要确认 JSON 文件里没有密钥、token、密码或客户敏感信息。

## MCP 有写入风险吗

`project-kb-mcp` 是本地 stdio MCP server，只暴露安全工具。它不暴露 apply。

如果某个 MCP 客户端支持自定义命令，团队不要把 `project-kb apply` 配成模型可调用工具。

## 项目记忆会不会变成个人记忆

不会。`remember` 只读取用户提供的结构化候选 JSON，只生成 proposal。它不读取聊天记录，不写个人长期记忆库，也不自动总结本地会话。

项目记忆进入 `knowledge/` 后就是团队共享内容，必须接受 Git review。需要替换已有记忆时，命令要显式传 `--replace-existing`。

## `.project-kb/` 要提交吗

默认不要提交。`.project-kb/proposals/` 是本地证据目录，通常用于当前 review 和人工确认。

稳定知识应该落在 `knowledge/**`，并通过 Git 审查。
