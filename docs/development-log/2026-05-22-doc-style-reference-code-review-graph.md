# 2026-05-22 参考 code-review-graph 文档风格调整记录

## 背景

本轮用户明确要求参考 `code-review-graph` 项目的文档风格来写 Project Atlas 的文档。

这次没有照搬对方文档内容，也没有引入对方的数据和图片，只参考文档组织方式和首屏表达方式。

## 参考了哪些风格元素

我这次主要参考了这几个点：

1. 标题下先给一句非常短的产品口号。
2. 口号下面立刻给多语言切换入口。
3. 首屏先讲问题和价值，再讲工具是什么。
4. 很早就给 Quick Start，而不是把快速开始放到较后位置。
5. 用更像 landing page 的 section 节奏，把首页从说明目录改成产品入口页。
6. 用明显的分隔线，把首屏内容拆成几个短块，降低阅读压力。

## 这次落到哪些文件

本轮调整了这三个入口页：

- `README.md`
- `docs/site/README.md`
- `docs/site/en/README.md`

调整重点如下：

- 根 README 改成一句英文 slogan 开头
- 根 README 把中英文切换入口上提到首屏
- 根 README 把 Quick Start 提前
- 中文首页改成一句中文 slogan 开头
- 英文首页改成一句英文 slogan 开头
- 中英文首页都改成先问题、再价值、再 Quick Start、再入口地图的节奏

## 明确没有做的事

为了避免文档失真，这次没有做这些事：

- 没有复制 `code-review-graph` 的产品数据、性能数字和图片
- 没有新增 badge
- 没有伪造社区指标
- 没有把 Project Atlas 写成和 `code-review-graph` 同一种产品

Project Atlas 还是按自己的产品边界来写，只是首屏表达更偏产品化。

## 验证

本轮执行：

```bash
npm test
```

结果：

- 测试通过，24 个测试全部通过

## 结论

这次调整后，Project Atlas 的三个主入口页更接近开源产品首页风格。

后续如果继续沿这个方向演进，建议保持这几条：

- slogan 保持短
- 首屏先讲问题和价值
- Quick Start 保持靠前
- 多语言入口始终放在首屏
- 目录页继续朝 landing page 方向写，不退回单纯索引页
