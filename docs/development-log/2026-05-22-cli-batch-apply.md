# 2026-05-22 CLI 批量 apply 与 y/n 确认记录

## 背景

用户在终端人工 apply 多个 proposal 时，需要复制多条命令，并且旧确认提示要求输入 `yes`。这在连续处理 proposal 时容易出错。

本轮目标是只增强 `project-atlas` CLI，不新增 OpenCode apply tool，也不让 agent 或 MCP 自动写入 `knowledge/**`。

## 实现过程

1. 先扩展 apply 测试。
2. 将单个 apply 的人工输入从 `yes/no` 改为 `y/n`。
3. 增加旧 `yes` 不会被接受的回归测试。
4. 增加 `project-atlas apply --all --confirm` 的逐个确认测试。
5. 增加 `project-atlas apply --all --confirm --yes-all` 的一次确认全部测试。
6. 增加批量失败停止测试，确认第二个 proposal 失败时第三个不会继续写入。
7. 在 CLI 参数中新增 `--all` 和 `--yes-all`。
8. 抽出交互确认、proposal 加载、批量筛选和实际写入 helper。
9. 更新 OpenCode adapter 文档，只提示终端批量命令，不新增 apply tool。

## 行为说明

- 单个写入仍使用 `project-atlas apply --repo <repo> --proposal-id <id> --confirm`。
- 批量逐个确认使用 `project-atlas apply --repo <repo> --all --confirm`。
- 批量一次确认使用 `project-atlas apply --repo <repo> --all --confirm --yes-all`。
- `--proposal-id` 和 `--all` 必须二选一。
- `--yes-all` 必须和 `--all` 一起使用。
- 人工确认只接受 `y` 和 `n`。
- 批量范围只包含状态为 `proposed` 的 proposal。
- 任意被选中的 proposal 写入失败时，命令立即停止。

## 安全边界

本轮仍然不提供 `project_atlas_apply` tool。

OpenCode adapter 只负责读、检查、review 和 proposal。真实写入仍要求用户在终端 TTY 中确认。

## 验证

先执行 apply 定向测试：

```bash
npm test -- --test-name-pattern="apply"
```

结果为 30 个测试全部通过。

最终执行全量测试：

```bash
npm test
```

结果：

- 30 个测试全部通过
