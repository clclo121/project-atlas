# 2026-05-22 初始化骨架与 OpenCode 校验兼容修复

## 背景

外部项目在用 `project-atlas init` 建完知识库后，再走现有 OpenCode 终端命令 `opencode-kb-apply-update` 时，apply 后置校验会失败。

失败信息集中在三个点：

- 缺少 `knowledge/logs`
- 缺少 `knowledge/assets`
- `knowledge/index.md` 缺少 `logs/` 目录入口

继续核对当前仓库实现后，确认问题不在业务项目，而在 `project-atlas` 初始化骨架和 OpenCode 现有知识库标准之间有一处不一致。

## 排查过程

1. 先核对 `src/core.ts` 的 `cmdInit`。
2. 确认当前初始化只创建 `project`、`domains`、`workflows`、`contracts`、`integrations`、`quality`、`decisions` 这七类目录。
3. 确认默认 `knowledge/index.md` 只挂了上述七类入口，没有 `logs` 和 `assets`。
4. 再核对本机 OpenCode 脚本 `opencode-kb-init.sh` 与 `opencode-kb-lib.sh`。
5. 确认 OpenCode 的 `kb_run_check_locked` 明确把 `knowledge/logs`、`knowledge/assets` 当成必需目录，并要求 `knowledge/index.md` 至少包含 `logs/` 入口。
6. 结论是当前仓库的初始化骨架比 OpenCode 校验规则少两块，导致外部项目在 proposal apply 阶段被回滚。

## 测试先行

先在 `test/cli.test.mjs` 的初始化测试里补了三个断言：

- `knowledge/logs` 必须存在
- `knowledge/assets` 必须存在
- `knowledge/index.md` 必须包含 `logs/README.md`

补完后先单跑测试，确认它先失败。失败点是 `knowledge/logs should exist`。

## 实现调整

在 `src/core.ts` 中做了最小修复：

1. 初始化目录时补上 `knowledge/logs` 和 `knowledge/assets`
2. 默认 `knowledge/index.md` 补上：
   - `- [Logs](logs/README.md)`
   - `- [Assets](assets/README.md)`
3. 初始化时额外生成：
   - `knowledge/logs/README.md`
   - `knowledge/assets/README.md`

这次没有放开 `knowledge/assets/**` 的 proposal 写入限制。当前限制仍然保留，只补齐初始化骨架和索引入口。

## 文档同步

同步更新 `docs/requirements.md` 的 `5.1 init`：

- 补充必须创建 `knowledge/logs/` 和 `knowledge/assets/`
- 补充必须在 `knowledge/index.md` 提供 `logs/` 和 `assets/` 入口

## 验证

先执行定向测试：

```bash
npm test -- --test-name-pattern="init requires a git repository and creates the knowledge skeleton"
```

结果：

- 首次运行失败，证明测试能抓到问题
- 实现修复后再次运行通过

后续如果继续发布这一轮修复，至少还应补跑一次全量：

```bash
npm test
```

## 影响说明

这次修复的目标是让 `project-atlas init` 产出的知识库骨架更接近当前 OpenCode 的知识库校验口径，减少项目初始化后在人工 apply 阶段才暴露结构问题的情况。

它不改变 proposal、apply、review-summary 的安全边界，也不改变 `knowledge/assets/**` 禁止通过 proposal 写入的规则。
