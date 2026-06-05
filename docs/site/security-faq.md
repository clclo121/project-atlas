# 安全 FAQ

## agent 能直接写知识库吗

不能。Project Atlas 的 CLI 适配器和 `project-atlas-mcp` 都不提供 apply tool。

agent 可以做的事：

- `scan`
- `context`
- `stale`
- `propose`
- `remember`
- `check`
- `review-summary`

agent 不能做的事：

- 直接调用 `project-atlas apply`
- 绕过 proposal 直接写 `knowledge/**`
- 在非 TTY 环境执行 apply

## 为什么 apply 必须在终端执行

`apply` 会真实写入知识文档。Project Atlas 要求人在终端里带 `--confirm` 执行，是为了避免模型在没有人工检查时直接改知识库。

## 敏感内容怎么处理

扫描配置时，只输出规则类型和文件路径，不输出真实值。当前规则覆盖 password、token、api key、access key、authorization、cookie、npm token、private key 和带账号密码的数据源 URL。

如果 proposal 命中敏感规则，状态会变成 `blocked_sensitive`，并且不会保存敏感原文。

## 外部证据安全吗

`external_evidence` 只保存外部工具给出的结构化摘要。它不会在运行时自动调用 Serena、Aider Repo Map 或其他图谱工具。

导入外部证据时，Project Atlas 会扫描 `source`、`source_type`、`path`、`symbol`、`summary` 和 `locator` 字段里的常见敏感内容。命中规则时会拒绝导入，并且错误信息只包含字段名和规则，不输出原文。

团队仍然要确认 JSON 文件里没有客户敏感数据和不适合共享的本机私有路径。

如果使用 `code-review-graph`，建议只导入结构、关键节点、影响半径、测试缺口和风险摘要，不导入完整源码片段、密钥、客户数据或本机私有路径。

## MCP 有写入风险吗

`project-atlas-mcp` 是本地 stdio MCP server，只暴露安全工具，不暴露 apply。

如果某个 MCP 客户端支持自定义命令，也不要把 `project-atlas apply` 配成模型可调用工具。

## 项目记忆会不会变成个人记忆

不会。`remember` 只读取你准备好的结构化候选 JSON，并生成 proposal。它不读取聊天记录，也不写个人长期记忆库。

项目记忆进入 `knowledge/` 之后，就是团队共享内容，仍然需要 Git review。

## `.project-atlas/` 要提交吗

默认不要提交。`.project-atlas/proposals/` 是本地 proposal 证据目录，通常只服务当前 review 和人工确认。

长期保留的知识应该落在 `knowledge/**`，并进入正常版本管理。
