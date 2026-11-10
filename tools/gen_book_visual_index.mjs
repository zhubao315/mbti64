#!/usr/bin/env node
/**
 * 《千分之一的你》阶段三：全书图片资产清单
 *
 * 事实源：
 *   - data/bookEnriched.json（16 基础型 + 真实章节号 / 章节路径）
 *   - docs/book-visual/01-视觉圣经.md（命名、画幅、色盘）
 *   - docs/book-visual/02-参考图提示词包.md（模板与版本）
 *
 * 产出：
 *   - docs/book-visual/assets-index.json   （机器可读索引）
 *   - docs/book-visual/04-资产清单.md      （人可读清单）
 *
 * 只做清单，不生成图片。
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOOK = JSON.parse(await fs.readFile(path.join(ROOT, "data", "bookEnriched.json"), "utf8")).types;

const GROUP = {
  INTJ: ["analyst", "NT"], INTP: ["analyst", "NT"], ENTJ: ["analyst", "NT"], ENTP: ["analyst", "NT"],
  INFJ: ["diplomat", "NF"], INFP: ["diplomat", "NF"], ENFP: ["diplomat", "NF"], ENFJ: ["diplomat", "NF"],
  ISTJ: ["guardian", "SJ"], ISFJ: ["guardian", "SJ"], ESTJ: ["guardian", "SJ"], ESFJ: ["guardian", "SJ"],
  ISTP: ["adventurer", "SP"], ISFP: ["adventurer", "SP"], ESTP: ["adventurer", "SP"], ESFP: ["adventurer", "SP"],
};
const PALETTE = {
  analyst: ["#7B61FF", "#4A3AAE"],
  diplomat: ["#4CAF6B", "#2FBFA0"],
  guardian: ["#4A90E2", "#1A659F"],
  adventurer: ["#F6C343", "#FFD98A"],
};
const VOLUME = { NT: "02", NF: "03", SJ: "04", SP: "05" };
const SUFFIX = [
  ["C-O", "初春觉醒"],
  ["A-O", "盛夏破局"],
  ["A-H", "金秋建制"],
  ["C-H", "深冬内观"],
];

const chapterOf = (base) => String(BOOK[base].bookChapter.match(/第(\d+)章/)?.[1] ?? "");

// ---------------------------------------------------------------- 参考图（阶段二已通过）
const REF = {
  "00_00_ALL_cover-front_v01": "01_cover_front_v01.png",
  "00_00_ALL_cover-back_v01": "02_cover_back_v01.png",
  "00_00_ALL_spine_v01": "03_spine_v02.png",
  "01_00_ALL_volume-opening_v01": "04_volume_01_opening_v01.png",
  "02_00_ALL_volume-opening_v01": "05_volume_02_v02.png",
  "03_00_ALL_volume-opening_v01": "06_volume_03_opening_v01.png",
  "04_00_ALL_volume-opening_v01": "07_volume_04_opening_v01.png",
  "05_00_ALL_volume-opening_v01": "08_volume_05_opening_v01.png",
  "06_00_ALL_volume-opening_v01": "09_volume_06_v02.png",
  "03_09_INFJ_base_v01": "03_09_INFJ_base_v01.png",
  "03_09_INFJ-C-O_suffix_v01": "11_type-INFJ_C-O_v01.png",
  "03_09_INFJ-A-O_suffix_v01": "12_type-INFJ_A-O_v01.png",
  "03_09_INFJ-A-H_suffix_v01": "13_type-INFJ_A-H_v01.png",
  "03_09_INFJ-C-H_suffix_v01": "14_type-INFJ_C-H_v01.png",
  "03_09_ALL_scene-roundtable-unspoken_v01": "15_scene_roundtable_INFJ_v02.png",
};

// 批次 3：16 张基础原型（2026-11-06 验收通过；5 张为 v03 比例修正版）
const BASE_REFS = {
  INTJ: "02_05_INTJ_base_v01.png",
  INTP: "02_06_INTP_base_v03.png",
  ENTJ: "02_07_ENTJ_base_v01.png",
  ENTP: "02_08_ENTP_base_v03.png",
  INFP: "03_10_INFP_base_v01.png",
  ENFP: "03_11_ENFP_base_v01.png",
  ENFJ: "03_12_ENFJ_base_v01.png",
  ISTJ: "04_13_ISTJ_base_v01.png",
  ISFJ: "04_14_ISFJ_base_v03.png",
  ESTJ: "04_15_ESTJ_base_v01.png",
  ESFJ: "04_16_ESFJ_base_v03.png",
  ISTP: "05_17_ISTP_base_v01.png",
  ISFP: "05_18_ISFP_base_v03.png",
  ESTP: "05_19_ESTP_base_v01.png",
  ESFP: "05_20_ESFP_base_v01.png",
};

const items = [];

function push(item) {
  // 批次4 起：refs 下与 ID 同名的文件自动视为该条目的参考图（64 亚型卡按此规则回写）
  const exact = path.join(ROOT, "docs", "book-visual", "refs", `${item.id}.png`);
  const refFile = existsSync(exact)
    ? `${item.id}.png`
    : (REF[item.id] ?? (item.kind === "type-base" ? BASE_REFS[item.type] : undefined));
  items.push({
    ...item,
    status: refFile ? "reference-passed" : "planned",
    ...(refFile ? { refFile } : {}),
  });
}

// 1. 封面系统
push({ id: "00_00_ALL_cover-front_v01", file: "00_00_ALL_cover-front_v01.png", kind: "cover", title: "封面正面", volume: "00", chapter: "00", type: "ALL", group: null, palette: ["四色平衡"], frame: "3:4", size: "1200×1600（印刷 210×285mm+3mm 出血）", use: "书籍正面封面主视觉，书名与副标题后期叠加", template: "T-COVER-FRONT", promptVersion: "v01", batch: 1 });
push({ id: "00_00_ALL_cover-back_v01", file: "00_00_ALL_cover-back_v01.png", kind: "cover", title: "封底", volume: "00", chapter: "00", type: "ALL", group: null, palette: ["四色平衡（降饱和）"], frame: "3:4", size: "1200×1600（同上）", use: "封底背景，预留简介/推荐语/二维码/条码四区", template: "T-COVER-BACK", promptVersion: "v01", batch: 1 });
push({ id: "00_00_ALL_spine_v01", file: "00_00_ALL_spine_v01.png", kind: "cover", title: "书脊", volume: "00", chapter: "00", type: "ALL", group: null, palette: ["四色细线"], frame: "1:6 竖窄", size: "40×285mm+3mm 出血（生图取中央窄带裁切）", use: "书脊四季演进线，中央为书名文字带", template: "T-SPINE", promptVersion: "v01", batch: 1 });

// 2. 六卷扉页
const VOLUMES = [
  ["01", "解码分辨率", "四层展开为六维的透明棱镜 + 四个基础维度 + 两个后缀旋钮", "四色平衡，浅灰与淡金打底"],
  ["02", "分析师：冷焰、拆解、统帅与变量", "展开的透明超立方体，内含棋盘、分形、战略路径与分岔路线", "丁香紫、深紫、冷青"],
  ["03", "外交家：点灯、展厅、火种与调度", "多面体提灯，光域照出深夜窗口、内心展厅、火种与共鸣环", "森林绿、薄荷青、暖金"],
  ["04", "守护者：地基、后勤、秩序与圈子", "六边形晶格、拱桥、记忆胶囊、齿轮矩阵与关系圆环构成的稳定建筑", "冰川蓝、钢青、银灰"],
  ["05", "冒险家：真章、诗意、拆弹与发电", "运动中的琥珀多面体，环绕涡轮、几何花、危机核心与音浪环", "琥珀金、暖黄、珊瑚橙"],
  ["06", "刻意练习工程", "四季符号与六维旋钮组成、逐渐扩大工具箱的可重复路径", "四色分段，高明度白底"],
];
for (const [vol, name, metaphor, palette] of VOLUMES) {
  push({ id: `${vol}_00_ALL_volume-opening_v01`, file: `${vol}_00_ALL_volume-opening_v01.png`, kind: "volume-opening", title: `第${Number(vol)}卷扉页 · ${name}`, volume: vol, chapter: "00", type: "ALL", group: null, palette: [palette], frame: "3:2", size: "2400×1600", use: "卷扉页主视觉，卷名与导语叠加于留白侧", template: "T-VOLUME", promptVersion: "v01", batch: 2, metaphor });
}

// 3. 16 基础原型 + 4. 64 亚型卡
for (const base of Object.keys(BOOK)) {
  const [grp, fam] = GROUP[base];
  const cn = BOOK[base].cn;
  const ch = chapterOf(base);
  const vol = VOLUME[fam];
  push({
    id: `${vol}_${ch}_${base}_base_v01`,
    file: `${vol}_${ch}_${base}_base_v01.png`,
    kind: "type-base",
    title: `${base} ${cn}`,
    volume: vol, chapter: ch, type: base, suffix: null, group: grp, family: fam,
    palette: PALETTE[grp], frame: "3:4", size: "1200×1600",
    use: `${base} 图鉴章节基础原型主视觉`, template: "T-BASE", promptVersion: "v01", batch: 3,
    derived: ["thumb-512×512", "mini-160×160"],
  });
  for (const [suf, season] of SUFFIX) {
    push({
      id: `${vol}_${ch}_${base}-${suf}_suffix_v01`,
      file: `${vol}_${ch}_${base}-${suf}_suffix_v01.png`,
      kind: "type-suffix",
      title: `${base}-${suf} ${cn} · ${season}`,
      volume: vol, chapter: ch, type: base, suffix: suf, season, group: grp, family: fam,
      palette: PALETTE[grp], frame: "3:4", size: "1200×1600",
      use: `${base}-${suf} 亚型详情卡（同角色只改七项状态）`, template: "T-SUFFIX", promptVersion: "v01", batch: 4,
      derived: ["thumb-512×512", "mini-160×160"],
    });
  }
}

// 5. 章节场景（23 张）
const SCENES = [
  ["01", "01", "resolution-ladder", "从 16 型到 64 型：低分辨率棱镜展开为六维结构"],
  ["01", "03", "rarity-pyramid", "稀有度金字塔：不同高度的几何晶体，表达分布与生态位而非等级"],
  ["01", "04", "four-seasons-cycle", "四季循环：同一角色经探路、破局、建制、内观回到下一轮觉醒"],
  ["02", "05", "meeting-hidden-variable", "会议室中的隐藏变量：长线推演者在别人讨论第一步时已算到第五步"],
  ["02", "06", "deconstruct-rule", "拆解一条看似合理的规则：把跑了三年的流程逐项拆开检验"],
  ["02", "07", "building-the-road", "混乱中铺设一条可执行道路：把模糊愿望推进成有节点的路径"],
  ["02", "08", "parallel-paths", "多条创新路径同时打开：分形魔方与莫比乌斯环并置"],
  ["03", "09", "roundtable-unspoken", "圆桌会议中捕捉未说出口的信息：提灯只照亮桌沿那段空气"],
  ["03", "10", "inner-museum", "一个人守护自己的内心展厅：记忆晶体与折纸蝴蝶"],
  ["03", "11", "catching-spark", "从别人身上捕捉尚未点燃的火种：向上飞行的几何碎片"],
  ["03", "12", "resonance-ring", "让一群人形成共鸣圆环：同心波纹把分散个体连成一个环"],
  ["04", "13", "bridge-foundation", "桥梁地基与长期维护：拱桥基座、铅垂线与精确刻度"],
  ["04", "14", "night-shift-details", "夜班中记住每个细节：整齐排列的记忆胶囊与保温灯匣"],
  ["04", "15", "reorder-the-flow", "把散乱流程重新排成秩序：方块自动归位的网格"],
  ["04", "16", "ritual-bonds", "用具体仪式维系关系网络：星辰节点编织的关系圆环"],
  ["05", "17", "find-the-real-fault", "拆开一件设备寻找真实故障：卡尺、涡轮核心与分解图"],
  ["05", "18", "color-and-touch", "用颜色和触感表达无法解释的审美：几何花朵与颜色声波"],
  ["05", "19", "crisis-first-move", "在突发危机现场立即行动：几何钳与剪断的警报线"],
  ["05", "20", "ignite-the-room", "聚光灯下点燃现场能量：棱镜麦克风球与音浪环"],
  ["06", "21", "practice-knobs", "练习旋钮：一天之内切换不同心理工具"],
  ["06", "23", "mirror-mentor", "向镜像导师借一件工具：跨族对标与工具借用"],
  ["06", "24", "thirty-day-path", "把抽象愿望变成 30 天刻度路径：目标点、刻度与箭头"],
  ["06", "22", "expand-the-toolbox", "工具箱逐渐扩容，但保留原来的核心物件"],
];
for (const [vol, ch, slug, theme] of SCENES) {
  push({ id: `${vol}_${ch}_ALL_scene-${slug}_v01`, file: `${vol}_${ch}_ALL_scene-${slug}_v01.png`, kind: "scene", title: theme, volume: vol, chapter: ch, type: "ALL", group: null, palette: ["单族群主色 + 一个辅助色"], frame: "16:9", size: "2400×1350", use: "章节叙事插图，一侧留白 ≥35% 供正文与标题", template: "T-SCENE", promptVersion: "v01", batch: 5, metaphor: theme });
}

// 6. 网站与分享
const WEB = [
  ["WEB_00_ALL_home-banner_v01", "home-banner", "首页横幅", "3:1", "2400×800", "首页首屏主视觉（棱镜核心 + 四色轨道）"],
  ["WEB_00_ALL_test-banner_v01", "test-banner", "测试页横幅", "3:1", "2400×800", "测试入口页横幅（六维结构 + 旋钮）"],
  ["WEB_00_ALL_rank-banner_v01", "rank-banner", "榜单页横幅", "3:1", "2400×800", "稀有度榜单页横幅（晶体分布，不表达等级）"],
  ["WEB_00_ALL_result-NT_v01", "result-NT", "结果页横幅 · 分析师", "16:9", "1600×900", "NT 结果页顶部配图"],
  ["WEB_00_ALL_result-NF_v01", "result-NF", "结果页横幅 · 外交家", "16:9", "1600×900", "NF 结果页顶部配图"],
  ["WEB_00_ALL_result-SJ_v01", "result-SJ", "结果页横幅 · 守护者", "16:9", "1600×900", "SJ 结果页顶部配图"],
  ["WEB_00_ALL_result-SP_v01", "result-SP", "结果页横幅 · 冒险家", "16:9", "1600×900", "SP 结果页顶部配图"],
  ["WEB_00_ALL_og-share_v01", "og-share", "分享图通用底图", "1.91:1", "1200×630", "OG/分享卡底图，文字后期叠加"],
];
for (const [id, slug, title, frame, size, use] of WEB) {
  push({ id, file: `${slug}_v01.png`, kind: "web", title, volume: "00", chapter: "00", type: "ALL", group: null, palette: ["四色平衡"], frame, size, use, template: "T-WEB", promptVersion: "v01", batch: 6 });
}

const byKind = {};
for (const it of items) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;

const index = {
  meta: {
    title: "《千分之一的你》全书图片资产索引",
    stage: "阶段三 · 资产清单",
    generatedAt: new Date().toISOString().slice(0, 10),
    version: "1.0",
    sources: [
      "data/bookEnriched.json（16 基础型 + 真实章节号）",
      "docs/book-visual/01-视觉圣经.md（命名 / 画幅 / 色盘 / 一致性）",
      "docs/book-visual/02-参考图提示词包.md（模板 / 提示词版本）",
    ],
    totals: { total: items.length, byKind },
    naming: "卷号_章节号_类型代码_用途_版本号；无类型归属用 ALL",
    batches: [
      { batch: 1, name: "封面 / 封底 / 书脊", count: 3 },
      { batch: 2, name: "六卷扉页", count: 6 },
      { batch: 3, name: "16 张基础原型", count: 16 },
      { batch: 4, name: "64 张亚型卡", count: 64 },
      { batch: 5, name: "23 张章节场景", count: 23 },
      { batch: 6, name: "网站与分享图", count: 8 },
    ],
    derived: [
      "每张 type-base / type-suffix 派生 512×512 缩略图与 160×160 mini 图（共 128 个衍生件，不单列 ID）",
      "封面 / 封底 / 书脊另需纯图版、参考线版、文字分层版（阶段五）",
    ],
    referencePassed: items.filter((i) => i.status === "reference-passed").length,
  },
  templates: {
    "T-COVER-FRONT": "提示词包 §C1（已通过参考图 01_cover_front_v01）",
    "T-COVER-BACK": "提示词包 §C2（已通过参考图 02_cover_back_v01）",
    "T-SPINE": "提示词包 §C3 + 修订 R1（已通过参考图 03_spine_v02）",
    "T-VOLUME": "提示词包 §V1–V6（已通过参考图 04–09）",
    "T-BASE": "提示词包 §T1（INFJ 已通过；其余 15 型需按视觉圣经 §3.2 替换信物/服装）",
    "T-SUFFIX": "提示词包 §T2–T5 四态模板（INFJ 已通过；其余 15 型复用同一角色描述）",
    "T-SCENE": "提示词包 §S1 场景母版（仅 S08 已通过）",
    "T-WEB": "视觉圣经 §7 画幅 + 提示词包母版改写，暂未出参考图",
  },
  items,
};

const docs = path.join(ROOT, "docs", "book-visual");
await fs.writeFile(path.join(docs, "assets-index.json"), JSON.stringify(index, null, 2) + "\n");

// ---------------------------------------------------------------- 人可读清单
const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - [...String(s)].reduce((a, c) => a + (c.charCodeAt(0) > 127 ? 2 : 1), 0)));
const md = [];

md.push("# 阶段三 · 全书图片资产清单\n");
md.push(`- 生成日期：${index.meta.generatedAt}　版本：v1.0　**不含任何新生成图片，仅清单**`);
md.push(`- 机器可读索引：[assets-index.json](./assets-index.json)`);
md.push(`- 事实源：\`data/bookEnriched.json\`（章节号真实存在）、[01-视觉圣经.md](./01-视觉圣经.md)、[02-参考图提示词包.md](./02-参考图提示词包.md)\n`);

md.push("## 1. 计数总览\n");
md.push("| 类别 | 数量 | 画幅 | 终稿尺寸 | 批次 |");
md.push("|---|---|---|---|---|");
md.push("| 封面 / 封底 / 书脊 | 3 | 3:4 ×2、1:6 ×1 | 1200×1600；40×285mm | 1 |");
md.push("| 六卷扉页 | 6 | 3:2 | 2400×1600 | 2 |");
md.push("| 16 基础原型 | 16 | 3:4 | 1200×1600 | 3 |");
md.push("| 64 亚型卡 | 64 | 3:4 | 1200×1600 | 4 |");
md.push("| 章节场景 | 23 | 16:9 | 2400×1350 | 5 |");
md.push("| 网站 / 分享 | 8 | 3:1 ×3、16:9 ×4、1.91:1 ×1 | 2400×800 / 1600×900 / 1200×630 | 6 |");
md.push(`| **合计** | **${items.length}** | — | — | — |\n`);
md.push(`另有衍生件：每张类型卡派生 512×512 缩略图与 160×160 mini 图，共 128 个，不单列 ID。\n`);

md.push("## 2. 命名与 ID 规则\n");
md.push("`卷号_章节号_类型代码_用途_版本号`，无类型归属写 `ALL`；官网资产以 `WEB_` 开头。\n");
md.push("```text\n00_00_ALL_cover-front_v01\n03_00_ALL_volume-opening_v01\n03_09_INFJ_base_v01\n03_09_INFJ-C-O_suffix_v01\n03_09_ALL_scene-roundtable-unspoken_v01\n```\n");

md.push("## 3. 封面系统（批次 1）\n");
md.push("| ID | 用途 | 尺寸 | 状态 |");
md.push("|---|---|---|---|");
for (const it of items.filter((i) => i.kind === "cover")) md.push(`| \`${it.id}\` | ${it.title} | ${it.size} | ${it.status === "reference-passed" ? "参考图已通过" : "待生成"} |`);
md.push("");

md.push("## 4. 六卷扉页（批次 2）\n");
md.push("| ID | 卷 | 核心隐喻 | 主色 | 状态 |");
md.push("|---|---|---|---|---|");
for (const it of items.filter((i) => i.kind === "volume-opening")) md.push(`| \`${it.id}\` | 第${Number(it.volume)}卷 | ${it.metaphor} | ${it.palette[0]} | ${it.status === "reference-passed" ? "已通过" : "待生成"} |`);
md.push("");

md.push("## 5. 16 基础原型（批次 3）\n");
md.push("| 代码 | 称号 | 族群 | 卷 / 章 | ID | 状态 |");
md.push("|---|---|---|---|---|---|");
for (const it of items.filter((i) => i.kind === "type-base")) md.push(`| ${it.type} | ${it.title.replace(`${it.type} `, "")} | ${it.family} | ${Number(it.volume)} / ${it.chapter} | \`${it.id}\` | ${it.status === "reference-passed" ? "已通过" : "待生成"} |`);
md.push("");

md.push("## 6. 64 亚型卡（批次 4）\n");
md.push("| 基础型 | 章 | C-O 初春 | A-O 盛夏 | A-H 金秋 | C-H 深冬 |");
md.push("|---|---|---|---|---|---|");
for (const base of Object.keys(BOOK)) {
  const ch = chapterOf(base);
  const ids = SUFFIX.map(([s]) => `\`${VOLUME[GROUP[base][1]]}_${ch}_${base}-${s}_suffix_v01\``).join(" | ");
  md.push(`| ${base} | ${ch} | ${ids} |`);
}
md.push("");
md.push("每张同时产出 `512×512` 缩略图与 `160×160` mini 图，用于网站卡片与榜单。\n");

md.push("## 7. 章节场景（批次 5，23 张）\n");
md.push("| # | 卷 / 章 | ID | 主题 |");
md.push("|---|---|---|---|");
SCENES.forEach(([vol, ch, slug, theme], i) => md.push(`| ${String(i + 1).padStart(2, "0")} | ${Number(vol)} / ${ch} | \`${vol}_${ch}_ALL_scene-${slug}_v01\` | ${theme} |`));
md.push("");
md.push("场景图统一 16:9，主体一侧，另一侧留白 ≥35%；只用一个族群主色 + 一个辅助色；不画医学/临床场景。\n");

md.push("## 8. 网站与分享（批次 6）\n");
md.push("| ID | 用途 | 尺寸 | 状态 |");
md.push("|---|---|---|---|");
for (const it of items.filter((i) => i.kind === "web")) md.push(`| \`${it.id}\` | ${it.title} | ${it.size} | 待生成 |`);
md.push("");

md.push("## 9. 当前状态\n");
md.push(`目前已通过 QC 的参考图 **${index.meta.referencePassed} 张**（阶段二 15 张 + 批次 3 的 16 张基础原型），对应清单中的以下条目（参考图为临时命名，正式资产按本清单命名）：\n`);
md.push("| 清单 ID | 参考图文件 |");
md.push("|---|---|");
for (const it of items.filter((i) => i.refFile)) md.push(`| \`${it.id}\` | \`${it.refFile}\` |`);
md.push("");
md.push(`剩余 **${items.length - index.meta.referencePassed} 张**为待生成状态，未伪造任何文件。\n`);

md.push("## 10. 阶段四分批与验收\n");
md.push("1. 每批只按上表顺序生成，不并行过多（建议单批串行）；");
md.push("2. 每批结束跑：尺寸 / 文件命名 / 白底一致性 / 主色 / 角色一致性 / 四态差异 / 文字与乱码 / 多余角色；");
md.push("3. 未通过件标记 `failed`，重出 `v02`，**不得**进入 `public/assets/book-visual/`；");
md.push("4. 通过件才提升为正式资产，并回写本清单状态；");
md.push("5. 书稿正文、64 型模型、稀有度数值、四季顺序、路由均不在本阶段改动范围。\n");

await fs.writeFile(path.join(docs, "04-资产清单.md"), md.join("\n"));

console.log(`总资产 ${items.length}：${JSON.stringify(byKind)}`);
console.log(`参考图已通过 ${index.meta.referencePassed}，待生成 ${items.length - index.meta.referencePassed}`);
console.log("已写入 docs/book-visual/assets-index.json 与 04-资产清单.md");
