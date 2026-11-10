# MBTI64 品牌 CI 升级 — 验收清单（Checklist）

> 逐项核对 `spec.md` 与 `tasks.md`。全部勾选后方可交付。

## 一、设计系统

- [x] `tailwind.config.ts` 提供 `navy / brand / surface / text / border / 四族群 / 语义色`，无旧 `violet/avocado/coral/cream/sand/glass/glow`
- [x] `app/globals.css` 无外部字体 `@import`；`:root` 变量与 Tailwind token 一致
- [x] 卡片统一 12px 圆角 + `#E7ECF2` 边框 + 轻阴影；按钮三型（primary/ghost/tertiary）样式正确
- [x] 字体栈为 `Inter + 系统中文字体`；无 Google Fonts 请求
- [x] 全站无硬编码旧品牌色（`#88619D` 等）；族群色统一读取 `GROUP_META`

## 二、品牌资源

- [x] `public/assets/brand` 含主标/图标/堆叠/深色/纯黑/纯白 SVG，均为真实路径、透明背景、无 base64 PNG
- [x] favicon 16/32/48/180/192/512 PNG 与 `favicon.svg`、`icon-512-maskable.png` 存在
- [x] `app/icon.svg`、`public/site.webmanifest`、`public/og/home.png` 已更新为品牌版
- [x] `BrandLogo.tsx` 引用同一套矢量源文件，且路径带 `basePath`（子路径部署可用）
- [x] Logo 在 24px 下可辨；四色顺序与族群语义一致

## 三、页面与组件

- [x] Header：Logo + 4 导航 + navy CTA；移动端折叠菜单可用
- [x] Footer：品牌区（Logo/中英描述/标语）+ 导航 + 免责声明 + 无关联声明
- [x] 首页 Hero 为「左文案 + 右品牌面板」，含 64 点阵与四族群图例
- [x] 首页数据指标/六维/四大族群/型别预览均已换肤，族群卡结构统一
- [x] 榜单页（稀有度档位 + 族群索引）全部使用新 token
- [x] 型别详情页：品牌头 + 族群淡底横幅 + navy 代码与标题
- [x] 答题页：小 Logo + navy 进度条 + navy 选中态，无花哨四色切换
- [x] 结果页：BrandLogo + 代码/名称/族群 chip + navy 单色雷达 + 中性稀有度 + navy 锁区
- [x] 分享海报：1080×1440，品牌头、族群色条、navy 六维条、中性稀有度、二维码
- [x] 无 emoji 作为核心品牌图标（族群/维度/按钮）

## 四、自动化与功能

- [x] `npm run typecheck` 通过
- [x] `npm run test` 通过（85 条）
- [x] `npm run build`（`NEXT_PUBLIC_BASE_PATH=/mbti64`）成功，74 个静态页导出
- [x] 子路径构建产物资源 URL 无 `/mbti64/mbti64` 双前缀；Logo/favicon/manifest/OG 均带正确前缀
- [x] 60 题 / 120 题模式可进入并完成；进度保存/恢复正常（120 题答 5 题后刷新显示第 6 题）
- [x] 结果计算、六维雷达、稀有度档位/名次、族群映射正确（60 题流程得到 ESTJ-A-O / 守护者）
- [x] 分享海报可预览、可下载 PNG，二维码指向正确 URL（预览 1080×1440）
- [x] `localStorage` key `p64:v1` 兼容旧数据（state 键完整：mode/answers/index/startedAt/finishedAt/seenEggs/unlocked）
- [x] 导航（首页/64 型人格/稀有榜/测评说明）全部可达

## 五、响应式与无障碍

- [x] 1440 / 1280 / 1024 / 768 / 390 / 375 / 360 均无横向溢出
- [x] 移动端 Logo 清晰、导航可用、卡片自动降列
- [x] 正文与按钮对比度满足 WCAG AA；族群/稀有度不只靠颜色传达
- [x] 触摸目标 ≥ 44px；焦点环可见；`prefers-reduced-motion` 生效

## 六、文档与收尾

- [x] `public/assets/brand/brand-guidelines.md` 覆盖 spec 第 11 节 9 项
- [x] `public/assets/portraits` 文件数量与基线一致（384 个）
- [x] 临时文件（`out/__seed.html`、`public/og/home.legacy.png`）已清理
- [x] `tasks.md` 全部勾选；交付报告含改动清单/回归结果/部署地址/未完成事项
