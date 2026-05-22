# 现在发布指南

本文记录当前仓库如果要马上发布到 npm，应按什么顺序做。

## 当前结论

- 包名是 `project-atlas`。
- 当前版本是 `0.1.0`。
- npm registry 当前没有同名包，可以按首次发布处理。
- 当前发布方式是手工发布，不做 GitHub Release，不做自动发布。
- 发布前必须保证本地 `main` 已经推送到 `origin/main`。
- `package.json` 当前 repository URL 指向 `project-atlas`。如果 GitHub 仓库还没有改名，先完成仓库改名，或者把 repository URL 调整为当前真实仓库。

## 发布前整理

先确认工作区和分支状态：

```bash
git status --branch --short
```

如果看到 `main...origin/main [ahead 1]`，说明本地有提交还没有推送。先推送：

```bash
git push origin main
```

确认 `CHANGELOG.md`。如果你要发布 `0.1.0`，就把本次要发布的 `Unreleased` 内容归入 `0.1.0`，或者确认 `Unreleased` 只保留下一版内容。

确认 GitHub 远端名称。如果要让 npm 页面指向 Project Atlas 仓库，先在 GitHub 上把仓库改名为 `project-atlas`，再更新本地 remote：

```bash
git remote set-url origin https://github.com/clclo121/project-atlas.git
git remote -v
```

## 本地验证

固定执行：

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

不应包含：

- `test/`
- `src/`
- `docs/development-log/`
- `node_modules/`

## npm 登录

确认 npm registry：

```bash
npm config get registry
```

期望是：

```text
https://registry.npmjs.org/
```

登录并确认账号：

```bash
npm login
npm whoami
```

如果开启了两步验证，按 npm CLI 提示输入验证码。

## 首次发布

发布前再次确认版本：

```bash
node -p "require('./package.json').name + '@' + require('./package.json').version"
```

当前应输出：

```text
project-atlas@0.1.0
```

执行发布：

```bash
npm publish
```

当前是非 scoped 包，不需要 `--access public`。如果以后改成 `@scope/project-atlas` 这类 scoped 包，再使用：

```bash
npm publish --access public
```

## 发布后验证

确认 npm 上的版本：

```bash
npm view project-atlas version
```

用临时目录安装验证：

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
npm init -y
npm install project-atlas
npx project-atlas --help
npx project-atlas-mcp --help
```

## 打 tag 和推送

npm 发布成功后再打 tag：

```bash
git tag v0.1.0
git push origin main --tags
```

如果 tag 已存在，不要覆盖。先检查：

```bash
git tag --list "v0.1.0"
```

## 失败处理

如果 `npm publish` 失败：

- `403 Forbidden` 通常是没有权限、包名不可用、账号未登录或版本已存在。
- `402 Payment Required` 通常和私有包或组织权限有关，当前项目应发布为 public。
- `ENEEDAUTH` 表示没有登录，重新执行 `npm login`。
- `You cannot publish over the previously published versions` 表示版本号已发布，需要升级 `package.json` 版本。

不要在发布失败后直接改 tag。只有 npm 发布成功后才创建版本 tag。
