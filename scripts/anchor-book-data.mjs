#!/usr/bin/env node
/**
 * 给书稿正文植入提取锚点（HTML 注释）
 *
 * 【做什么】
 * 1. 每个图鉴章的四个状态，正文里已有的「隐秘卡点」「跃迁信号」段落，
 *    就地包上 `<!-- @stuck:C-O -->` / `<!-- @signal:A-H -->` 锚点；
 * 2. 原稿里确实没有对应表述的 21 处，按 NEW_CONTENT 表把句子写回正文
 *    （原 EDITORIAL 补写表里的 5 处也在这里回归正文）；
 * 3. 板块三的三个现场（职场 / 饭局 / 微信）与防线清单，
 *    包上 `<!-- @slice:career -->` 等锚点。
 *
 * 【为什么】
 * 提取脚本此前靠正则找这些句子：作者润色一下文案，管道就退化成通用兜底。
 * 锚点把「这一句就是数据源」写进原稿，从此不再靠猜。
 * 注释对读者不可见，读者看到的书稿与之前完全一样。
 *
 * 【幂等】
 * 重复执行不会重复插入：已带锚点的段落会跳过。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { anchorRe, wrapAnchor } from "./lib/book-anchor.mjs";
import { NEW_CONTENT } from "./lib/book-anchor-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOOK_ROOT = path.join(ROOT, "书-千分之一的你");

/** 与 extract-book-data.mjs 保持一致的关键字口径（含扩展词，两者都要能命中） */
const STUCK_RE =
  /最隐秘的(?:生命周期)?卡点|隐秘的卡点|最大盲区|盲区|最大隐忧|最深的隐忧|隐忧|陷阱在于|陷阱|核心卡点|卡点|最危险的地方|路径依赖的阴影|阴影|路径依赖与感知钝化|越来越难说不|潜藏着危机|容忍度越来越低|不像你了|埋着最深的隐患/;
const SIGNAL_RE =
  /的信号|跃迁|转折|契机|破壁|第一次正面看见自己那堵墙|打破冬季闭环的钥匙|第一毫米|游牧民族|声音像录音|门就开了|深夜怀疑|那句话像一面镜子|守在原地等别人绕过去|被一个陌生人打断|挪动的信号|反过来改写她的感官|长出冬天的边境|再把门推开一次|不知道门后是什么|第一次意识到|忽然有点反胃/;

/** 章节清单（与 extract-book-data.mjs 的 BASE_INFO 对齐） */
const BASE_INFO = [
  { base: "INTJ", dir: "02-第二卷-分析师族群-NT", file: "第05章-INTJ-冷焰策士" },
  { base: "INTP", dir: "02-第二卷-分析师族群-NT", file: "第06章-INTP-拆解者" },
  { base: "ENTJ", dir: "02-第二卷-分析师族群-NT", file: "第07章-ENTJ-推土机型统帅" },
  { base: "ENTP", dir: "02-第二卷-分析师族群-NT", file: "第08章-ENTP-变量制造者" },
  { base: "INFJ", dir: "03-第三卷-外交家族群-NF", file: "第09章-INFJ-深夜点灯人" },
  { base: "INFP", dir: "03-第三卷-外交家族群-NF", file: "第10章-INFP-内心博物馆" },
  { base: "ENFP", dir: "03-第三卷-外交家族群-NF", file: "第11章-ENFP-火种捕手" },
  { base: "ENFJ", dir: "03-第三卷-外交家族群-NF", file: "第12章-ENFJ-情绪调度师" },
  { base: "ISTJ", dir: "04-第四卷-守护者族群-SJ", file: "第13章-ISTJ-地基工程师" },
  { base: "ISFJ", dir: "04-第四卷-守护者族群-SJ", file: "第14章-ISFJ-沉默后勤部" },
  { base: "ESTJ", dir: "04-第四卷-守护者族群-SJ", file: "第15章-ESTJ-秩序执行官" },
  { base: "ESFJ", dir: "04-第四卷-守护者族群-SJ", file: "第16章-ESFJ-关系维系者" },
  { base: "ISTP", dir: "05-第五卷-冒险家族群-SP", file: "第17章-ISTP-手上见真章" },
  { base: "ISFP", dir: "05-第五卷-冒险家族群-SP", file: "第18章-ISFP-感官诗人" },
  { base: "ESTP", dir: "05-第五卷-冒险家族群-SP", file: "第19章-ESTP-局面拆弹手" },
  { base: "ESFP", dir: "05-第五卷-冒险家族群-SP", file: "第20章-ESFP-现场发电机" },
];

/** 板块三子节 → 锚点切片名 */
const SLICE_RULES = [
  { name: "career", re: /职场|生态位|岗位|赛道/ },
  { name: "dinner", re: /饭局|酒桌|餐桌|聚餐/ },
  { name: "wechat", re: /微信|群聊|私聊|消息/ },
  { name: "defense", re: /防线|低耗能|微动作|练习/ },
];

const STATE_RE = /### 第[一二三四]态[^\n]*?`([A-Z]{4})-([AC])-([OH])`[^\n]*/g;

/** 找到段落里第一句命中关键字的段落（与提取脚本 pickLine 同口径：整段参与） */
function findParagraph(body, re) {
  const paras = body.split(/\n+/).filter((p) => p.trim());
  for (const p of paras) {
    if (re.test(p)) return p.trim();
  }
  return "";
}

/** 在整章文本里定位某个状态的正文区间 */
function stateRanges(text) {
  const out = [];
  let m;
  STATE_RE.lastIndex = 0;
  while ((m = STATE_RE.exec(text)) !== null) {
    const suffix = `${m[2]}-${m[3]}`;
    const start = m.index + m[0].length;
    const rest = text.slice(start);
    const endM = rest.match(/\n### |\n## |$/);
    const end = start + endM.index;
    out.push({ code: `${m[1]}-${suffix}`, suffix, start, end, body: rest.slice(0, endM.index) });
  }
  return out;
}

function anchorStates(text, report) {
  // 从后往前处理，避免前面的插入影响后面的下标
  const ranges = stateRanges(text);
  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const r = ranges[i];
    const extra = NEW_CONTENT[r.code] ?? {};
    const edits = [];

    // 先在原始正文里定位两段原文，再统一决定怎么包锚点
    const paraOf = {};
    for (const kind of ["stuck", "signal"]) {
      if (r.body.match(anchorRe(kind, r.suffix))) continue; // 已有锚点
      if (extra[kind]) continue; // 用新写的正文，不用原文

      const re = kind === "stuck" ? STUCK_RE : SIGNAL_RE;
      const para = findParagraph(r.body, re);
      if (!para) {
        report.missing.push(`${r.code} ${kind}`);
        continue;
      }
      // 只在本状态区间内定位，避免命中别的状态的同名段落
      const idx = text.indexOf(para, r.start);
      if (idx < 0 || idx + para.length > r.end) {
        report.missing.push(`${r.code} ${kind}（定位失败）`);
        continue;
      }
      paraOf[kind] = { para, at: idx };
    }

    const stuckPara = paraOf.stuck;
    const signalPara = paraOf.signal;

    if (stuckPara && signalPara && stuckPara.para === signalPara.para) {
      // 卡点与跃迁信号写在同一段里（部分章节的写法）：
      // 用一层套一层的方式包两个锚点，提取时各自剥掉内层注释。
      edits.push({
        at: stuckPara.at,
        remove: stuckPara.para.length,
        insert:
          `<!-- @stuck:${r.suffix} -->\n` +
          `<!-- @signal:${r.suffix} -->\n${stuckPara.para}\n` +
          `<!-- /@signal:${r.suffix} -->\n<!-- /@stuck:${r.suffix} -->`,
      });
      report.wrapped.push(`${r.code} stuck+signal（同段）`);
    } else {
      for (const [kind, hit] of Object.entries(paraOf)) {
        edits.push({
          at: hit.at,
          remove: hit.para.length,
          insert: wrapAnchor(kind, r.suffix, hit.para),
        });
        report.wrapped.push(`${r.code} ${kind}`);
      }
    }

    // 原稿确实没有对应表述的：把新写的句子补到该状态正文末尾
    for (const kind of ["stuck", "signal"]) {
      if (r.body.match(anchorRe(kind, r.suffix))) continue;
      if (!extra[kind]) continue;
      if (paraOf[kind]) continue; // 已经用原文包好了
      edits.push({
        at: r.end,
        insert: `\n${wrapAnchor(kind, r.suffix, extra[kind])}\n`,
      });
      report.added.push(`${r.code} ${kind}（新增正文）`);
    }

    for (const e of edits.sort((a, b) => b.at - a.at)) {
      text = text.slice(0, e.at) + (e.insert ?? "") + text.slice(e.at + (e.remove ?? 0));
    }
  }
  return text;
}

/** 纯散文版板块三的语义切点（与 extract-book-data.mjs 同口径） */
const PROSE_MARKERS = {
  dinner: /\n\n饭局/,
  wechat: /\n\n微信|微信里的你|微信上的你/,
  defense: /\n\n要止住|低耗能|三道硬性|物理防线|物理开关|第[一二三四五六七八九十]+条/,
};

function anchorSlices(text, report) {
  const m = text.match(/## 板块三[^#]*?([\s\S]*?)(?=\n## 板块四)/);
  if (!m) return text;
  const bodyStart = m.index + m[0].indexOf(m[1]);
  const body = m[1];

  // 没有 ### 子节的章节：按语义切点把整段散文切成三个现场 + 防线清单
  if (!/^### /m.test(body)) {
    const prose = body.replace(/^[^\n]*\n+/, "");
    const iDinner = prose.search(PROSE_MARKERS.dinner);
    const iWechat = prose.search(PROSE_MARKERS.wechat);
    const iDefense = prose.search(PROSE_MARKERS.defense);
    const endDinner = iWechat > iDinner ? iWechat : iDefense > iDinner ? iDefense : prose.length;
    const endWechat = iDefense > iWechat ? iDefense : prose.length;

    const parts = [
      ["career", iDinner > 0 ? prose.slice(0, iDinner) : prose],
      ["dinner", iDinner > 0 ? prose.slice(iDinner, endDinner) : ""],
      ["wechat", iWechat > 0 ? prose.slice(iWechat, endWechat) : ""],
      ["defense", iDefense > 0 ? prose.slice(iDefense) : ""],
    ];

    const idx = text.indexOf(prose, bodyStart);
    if (idx >= 0) {
      const blocks = parts
        .filter(([, content]) => content.trim())
        .map(([name, content]) => wrapAnchor("slice", name, content.trim()));
      text =
        text.slice(0, idx) +
        blocks.join("\n\n") +
        text.slice(idx + prose.length);
      report.wrapped.push("slice:散文版三切片");
    }
    return text;
  }

  // 子节切分：### 标题 + 正文
  const parts = body.split(/\n### /).slice(1);
  let offset = bodyStart;
  const edits = [];
  for (const part of parts) {
    const title = part.split("\n")[0];
    const content = part.split("\n").slice(1).join("\n").trim();
    const rule = SLICE_RULES.find((r) => r.re.test(title));
    if (!rule) continue;
    if (body.match(anchorRe("slice", rule.name))) continue;

    const idx = text.indexOf(content, offset);
    if (idx < 0) {
      report.missing.push(`slice:${rule.name}（定位失败）`);
      continue;
    }

    // 子节里同时含「低耗能防线」编号清单时，把清单单独锚出来，
    // 别让防线条目混进饭局切片的正文里
    const listIdx = content.search(/\n\d+\.\s/);
    if (listIdx > 0) {
      const prose = content.slice(0, listIdx).trim();
      const list = content.slice(listIdx).trim();
      const idx2 = text.indexOf(prose, idx);
      edits.push({
        at: idx2,
        remove: content.length,
        insert: `${wrapAnchor("slice", rule.name, prose)}\n\n${wrapAnchor("slice", "defense", list)}`,
      });
      report.wrapped.push(`slice:${rule.name}+defense（拆段）`);
      offset = idx + content.length;
      continue;
    }

    // 饭局与微信写在同一子节时，按语义锚点切成两段，分别打锚点
    if (rule.name === "dinner") {
      const split = content.search(
        /(?:^|\n\n)(?:而在微信|在微信|微信群|群聊|私聊|微信里|微信上|到了微信|微信这片|微信能量)/m,
      );
      if (split > 0) {
        const dinnerPart = content.slice(0, split).trim();
        const wechatPart = content.slice(split).trim();
        edits.push({
          at: idx,
          remove: content.length,
          insert:
            `${wrapAnchor("slice", "dinner", dinnerPart)}\n\n` +
            `${wrapAnchor("slice", "wechat", wechatPart)}`,
        });
        report.wrapped.push("slice:dinner+wechat（拆段）");
        offset = idx + content.length;
        continue;
      }
    }

    edits.push({ at: idx, remove: content.length, insert: wrapAnchor("slice", rule.name, content) });
    report.wrapped.push(`slice:${rule.name}`);
    offset = idx + content.length;
  }

  for (const e of edits.sort((a, b) => b.at - a.at)) {
    text = text.slice(0, e.at) + e.insert + text.slice(e.at + e.remove);
  }
  return text;
}

const report = { wrapped: [], added: [], missing: [] };
let changed = 0;

for (const info of BASE_INFO) {
  const file = path.join(BOOK_ROOT, info.dir, `${info.file}.md`);
  if (!fs.existsSync(file)) {
    console.error(`❌ 找不到章节: ${file}`);
    process.exit(1);
  }
  const original = fs.readFileSync(file, "utf8");
  let text = original;
  text = anchorStates(text, report);
  text = anchorSlices(text, report);
  if (text !== original) {
    fs.writeFileSync(file, text, "utf8");
    changed += 1;
  }
}

console.log(`✓ 已为 ${changed} 个章节植入锚点`);
console.log(`   包裹既有段落：${report.wrapped.length} 处`);
console.log(`   补写缺失正文：${report.added.length} 处`);
if (report.missing.length > 0) {
  console.error(`❌ 仍有 ${report.missing.length} 处无法定位：`);
  for (const m of report.missing) console.error(`   ${m}`);
  process.exit(1);
}
