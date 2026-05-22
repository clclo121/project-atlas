# 现在发布指南

今天就发包，先按这个顺序走。

[English](en/publish-now.md) | [简体中文](publish-now.md)

这份文档只回答一个问题。当前仓库如果今天就要发布到 npm，应该按什么顺序做。

更长期的规则看 [发布流程](release-process.md)。

---

## 当前结论

- 包名是 `project-atlas`
- 当前版本是 `0.1.0`
- 当前发布方式是手工发布
- 当前不做 GitHub Release
- 发布前应保证本地主分支已经同步到远端
- `README.md` 和 `docs/site/` 已经是 npm 包的一部分，发包前要一起检查

---

## 先看工作区状态

```bash
git status --branch --short
git remote -v
```

如果本地主分支领先远端，先推送：

```bash
git push origin main
```

---

## 发布前检查清单

先确认这些文件是当前版本：

- `package.json`
- `CHANGELOG.md`
- `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`

再执行固定验证：

```bash
npm run lint:types
npm test
npm run verify
npm pack --dry-run
node dist/index.js --help
node dist/index.js init --help
node dist/index.js context --help
node dist/index.js propose --help
node dist/index.js remember --help
node dist/index.js check --help
node dist/mcp.js --help
```

---

## 检查打包内容

`npm pack --dry-run` 应包含：

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `dist/`
- `adapters/`
- `schema/`
- `templates/`
- `docs/site/`
- `package.json`

通常不应包含：

- `test/`
- `src/`
- `docs/development-log/`
- `node_modules/`

---

## npm 登录

确认当前 registry：

```bash
npm config get registry
```

确认登录身份：

```bash
npm login
npm whoami
```

---

## 正式发布

确认工作区干净后执行：

```bash
npm publish
```

如果以后要做测试发布，再补 `--tag`。当前这份文档只覆盖正式默认发布。

---

## 发布后验证

发布完成后检查：

```bash
npm view project-atlas version
npm view project-atlas dist-tags
```

再做一次安装验证：

```bash
npm install -g project-atlas
project-atlas --help
project-atlas-mcp --help
```

---

## 打 tag 并推送

如果发布成功，再补版本 tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

如果本次发布版本不是 `0.1.0`，把 tag 名改成真实版本号。

---

## 失败时先看什么

常见回看顺序如下：

1. `npm whoami` 是否是预期账号
2. `npm pack --dry-run` 是否缺少文档或构建产物
3. `npm test` 和 `npm run verify` 是否真的通过
4. `README.md` 和 `docs/site/` 的链接是否仍然正确
5. `package.json` 里的版本号和仓库信息是否正确
