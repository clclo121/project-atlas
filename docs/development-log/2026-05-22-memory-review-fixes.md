# 2026-05-22 项目记忆审查修复日志

## 背景

本轮修复来自项目级记忆能力的代码审查。审查发现四类问题：

- 记忆候选里的 frontmatter 字段可以带换行，可能污染生成的知识文件元数据。
- `source_files` 可以指向仓库外路径，影响团队复现，也会暴露本机路径 hash。
- `--replace-existing false` 会被当作开启覆盖。
- 同一个 proposal 内重复 target 会在 apply 时以后写覆盖先写，reviewer 不容易发现。

## 修复过程

先补失败测试，再改实现。

新增测试覆盖：

- `propose` 拒绝 `source_files` 中的 `../outside.md`。
- `propose` 拒绝重复 target。
- `remember` 拒绝 topic 等 frontmatter 标量里的换行。
- `remember` 拒绝仓库外 source path。
- `remember --replace-existing false` 报错。
- `remember` 拒绝重复 target。
- `propose` 拒绝 `.project-atlas/` 这类本地证据目录作为 source。
- `remember` 拒绝 `C:/...` 这类盘符路径作为 source。
- memory candidate schema 的 source path 正则同步拒绝本地证据目录、盘符路径和反斜杠形式的上级目录。

第一次执行 `npm test` 时，新增用例按预期失败。随后收紧输入校验，再次执行测试通过。

## 实现调整

- 新增 repo-relative path 校验，拒绝绝对路径、`..`、空值、换行和 NUL。
- repo-relative path 校验继续拒绝 `.git/`、`.project-atlas/`、`.code-review-graph/`，避免共享知识依赖本地证据或 Git 内部文件。
- repo-relative path 校验拒绝 Windows 盘符路径，避免把 `C:/...` 当成普通相对路径。
- `updates-file.source_files` 和 memory candidate `source_files` 都走同一套校验。
- 从旧知识文档继承 source metadata 时，也会重新校验 source path。
- 新增 frontmatter 标量校验，`topic`、`scope`、`summary`、`owner` 不能包含换行或 NUL。
- `validateKnowledgeTarget` 拒绝换行和 NUL。
- proposal 创建阶段拒绝重复 target。
- 布尔 flag 只允许裸参数，带值会报短错误。
- `schema/memory-candidate.schema.json` 同步补路径和单行字段约束。

## 验证命令

已执行：

```bash
npm test
```

后续收口还会执行：

```bash
npm run lint:types
npm test
npm run verify
```

## 未纳入范围

- 没有改变 apply 必须人工终端执行的边界。
- 没有新增自动修复或自动 apply。
- 没有引入 YAML 依赖，第一版继续使用轻量 frontmatter 生成和严格输入校验。
