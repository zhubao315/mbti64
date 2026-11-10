# 一次性调试脚本归档

本目录存放 2026-11 批次卡片渲染时期的临时脚本，仅本地保留，已由 `.gitignore` 排除，不进入仓库。

| 文件 | 用途 |
|------|------|
| `tmp-render-all.mjs` / `tmp-render-isfj.mjs` | 用无头 Chromium 批量渲染 64 型卡片 |
| `tmp-overlay-all.mjs` / `tmp-overlay-isfj.mjs` | 在卡片上叠加文案并注入 Noto Sans SC 字体 |

## 为什么移出 `scripts/`

这四个脚本依赖 `@sparticuz/chromium`（约 60 MB 无头浏览器二进制）与
`@fontsource/noto-sans-sc`，但静态导出的站点运行时完全不需要它们。
此前它们被误写进 `package.json` 的 `dependencies`，导致：

- `package-lock.json` 未同步、`npm ls` 报 `UNMET DEPENDENCY`
- 两个包实际并未安装，脚本本来就跑不起来
- 生产依赖被塞入纯构建期的工具

正式渲染脚本（`scripts/render-64-cards.mjs`、`render-mode-posters.mjs`、
`overlay-cards.mjs`）仍保留在 `scripts/`，它们只用已声明的 `playwright-core`。

## 如需重新运行

```bash
npm install --no-save @sparticuz/chromium @fontsource/noto-sans-sc
node tools/archive/tmp-render-isfj.mjs
```

运行结束后不需要把这两个包写回 `package.json`。
