# 2026-05-22 文档站点双语重构记录

## 背景

本轮目标是重做 Project Atlas 的开源文档入口，让根 README、中文站点和英文站点各自职责更清楚。

这次不改 CLI、schema 和运行时行为，只改文档结构、文案和测试断言。

## 为什么从中英混排改成双语独立

之前的根 README 同时承担中文说明、英文跳转、命令手册和文档目录几种角色。首屏信息太多，而且新用户第一次进入仓库时，很难快速判断下一步该看哪里。

这次改成双语独立，原因有三点：

1. GitHub 开源首访用户默认更适合先看到英文主入口。
2. 中文用户仍然需要完整、自然的中文说明，而不是夹在英文正文里的跳转片段。
3. 中英文文档长期维护时，结构一致但内容独立，比硬翻译更稳，也更容易按各自读者习惯继续扩展。

## 为什么保持现有 slug 稳定

本轮没有改动已有文件名，也没有删除既有入口页。主要原因如下：

1. 当前测试已经对 `README.md`、`docs/site/` 和部分英文页做了存在性断言。
2. npm 包会把 `docs/site/` 一起打包，外部链接一旦漂移，历史链接和安装包内阅读路径都会受影响。
3. 这次目标是重构信息架构，不是重命名文件路径。先稳住链接，再优化内容，更适合当前阶段。

## 这次做了哪些文档调整

### 根 README

- 把根 `README.md` 改成英文主入口
- 首屏只保留产品定位、解决的问题、安全边界、最短试用路径和文档入口
- 把细节说明下沉到 `docs/site/` 和 `docs/site/en/`

### 中文站点

重写了这些页面：

- `docs/site/README.md`
- `docs/site/quick-start.md`
- `docs/site/agent-quickstart.md`
- `docs/site/best-practices.md`
- `docs/site/team-rollout.md`
- `docs/site/security-faq.md`
- `docs/site/release-process.md`
- `docs/site/publish-now.md`

中文站点现在按新用户路径组织，首页先讲价值，再分流到试用、agent 接入和发布路径。

### 英文站点

重写了已有页面：

- `docs/site/en/README.md`
- `docs/site/en/quick-start.md`
- `docs/site/en/agent-quickstart.md`

补齐了缺失的英文镜像页：

- `docs/site/en/best-practices.md`
- `docs/site/en/team-rollout.md`
- `docs/site/en/security-faq.md`
- `docs/site/en/release-process.md`
- `docs/site/en/publish-now.md`

英文站点现在和中文站点保持同样的文档结构，但正文独立编写。

## Agent 文档调整

这次把 `docs/site/agent-quickstart.md` 改成中文正文，不再保留之前的纯英文正文。

中英文两份 agent 文档都统一覆盖这些内容：

- first probe
- read context
- health check
- knowledge proposal
- project memory proposal
- MCP 工具范围
- 安全边界
- 回答模板

## 测试改动

本轮更新了 `test/cli.test.mjs` 里的文档治理断言：

1. 根 README 的断言改成检查中英文首页和 quick start 入口。
2. 英文站点存在性检查从 3 页扩到完整 8 页镜像。
3. 去掉了之前对 `docs/site/agent-quickstart.md` 不能出现中文的限制。
4. 改成对中英文 agent 文档都校验关键命令、MCP 工具名和 `project-atlas apply` 安全边界。

## 人工复核

本轮人工复核重点看了这些点：

1. 根 README 是否同时指向中文和英文首页。
2. 中英文首页是否都能分流到 quick start、agent 和发布路径。
3. 文档命令名是否统一使用 `project-atlas` 和 `project-atlas-mcp`。
4. `apply` 的人工执行边界在中英文页面里是否一致。
5. 中文页正文为中文，英文页正文为英文，没有再出现主页面语言错位。

## 验证结果

执行结果如下：

```bash
npm run lint:types
npm test
npm pack --dry-run
```

结果：

- `npm run lint:types` 通过
- `npm test` 通过，24 个测试全部通过
- `npm pack --dry-run` 通过，`docs/site/` 和新增英文镜像页已进入 tarball

## 结论

这次重构完成后，Project Atlas 的文档入口已经从资料堆式入口，调整成面向开源新用户的双语分流结构。

后续如果继续扩文档，优先保持这条约束：

- 根 README 只做英文主入口
- 中文和英文站点保持同结构
- 细节说明下沉到对应子页
- 新增页面优先成对补齐中英文版本
