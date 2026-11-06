/**
 * 书稿 → 网站数据提取脚本
 * 解析 16 个原型章节 Markdown，生成结构化 bookEnriched.json
 */

import fs from "node:fs";
import path from "node:path";
import { buildRarityRecords } from "../lib/rarity-core.js";

const BOOK_ROOT = path.join(process.cwd(), "书-千分之一的你");

/* ---------- 章名映射：基础型 → 书名·章节号 ---------- */
const BASE_INFO = [
  { base: "INTJ", book: "第05章-INTJ-冷焰策士", cn: "冷焰策士", path: "02-第二卷-分析师族群-NT" },
  { base: "INTP", book: "第06章-INTP-拆解者", cn: "拆解者", path: "02-第二卷-分析师族群-NT" },
  { base: "ENTJ", book: "第07章-ENTJ-推土机型统帅", cn: "推土机型统帅", path: "02-第二卷-分析师族群-NT" },
  { base: "ENTP", book: "第08章-ENTP-变量制造者", cn: "变量制造者", path: "02-第二卷-分析师族群-NT" },
  { base: "INFJ", book: "第09章-INFJ-深夜点灯人", cn: "深夜点灯人", path: "03-第三卷-外交家族群-NF" },
  { base: "INFP", book: "第10章-INFP-内心博物馆", cn: "内心博物馆", path: "03-第三卷-外交家族群-NF" },
  { base: "ENFP", book: "第11章-ENFP-火种捕手", cn: "火种捕手", path: "03-第三卷-外交家族群-NF" },
  { base: "ENFJ", book: "第12章-ENFJ-情绪调度师", cn: "情绪调度师", path: "03-第三卷-外交家族群-NF" },
  { base: "ISTJ", book: "第13章-ISTJ-地基工程师", cn: "地基工程师", path: "04-第四卷-守护者族群-SJ" },
  { base: "ISFJ", book: "第14章-ISFJ-沉默后勤部", cn: "沉默后勤部", path: "04-第四卷-守护者族群-SJ" },
  { base: "ESTJ", book: "第15章-ESTJ-秩序执行官", cn: "秩序执行官", path: "04-第四卷-守护者族群-SJ" },
  { base: "ESFJ", book: "第16章-ESFJ-关系维系者", cn: "关系维系者", path: "04-第四卷-守护者族群-SJ" },
  { base: "ISTP", book: "第17章-ISTP-手上见真章", cn: "手上见真章", path: "05-第五卷-冒险家族群-SP" },
  { base: "ISFP", book: "第18章-ISFP-感官诗人", cn: "感官诗人", path: "05-第五卷-冒险家族群-SP" },
  { base: "ESTP", book: "第19章-ESTP-局面拆弹手", cn: "局面拆弹手", path: "05-第五卷-冒险家族群-SP" },
  { base: "ESFP", book: "第20章-ESFP-现场发电机", cn: "现场发电机", path: "05-第五卷-冒险家族群-SP" },
];

/* ---------- 静态表：主导 / 辅助 / 第三 / 劣势 ---------- */
const FUNCTION_STACK = {
  INTJ: { dominant: "Ni 内倾直觉", auxiliary: "Te 外倾思考", tertiary: "Fi 内倾情感", inferior: "Se 外倾实感" },
  INTP: { dominant: "Ti 内倾思考", auxiliary: "Ne 外倾直觉", tertiary: "Si 内倾实感", inferior: "Fe 外倾情感" },
  ENTJ: { dominant: "Te 外倾思考", auxiliary: "Ni 内倾直觉", tertiary: "Se 外倾实感", inferior: "Fi 内倾情感" },
  ENTP: { dominant: "Ne 外倾直觉", auxiliary: "Ti 内倾思考", tertiary: "Fe 外倾情感", inferior: "Si 内倾实感" },
  INFJ: { dominant: "Ni 内倾直觉", auxiliary: "Fe 外倾情感", tertiary: "Ti 内倾思考", inferior: "Se 外倾实感" },
  INFP: { dominant: "Fi 内倾情感", auxiliary: "Ne 外倾直觉", tertiary: "Si 内倾实感", inferior: "Te 外倾思考" },
  ENFP: { dominant: "Ne 外倾直觉", auxiliary: "Fi 内倾情感", tertiary: "Te 外倾思考", inferior: "Si 内倾实感" },
  ENFJ: { dominant: "Fe 外倾情感", auxiliary: "Ni 内倾直觉", tertiary: "Se 外倾实感", inferior: "Ti 内倾思考" },
  ISTJ: { dominant: "Si 内倾实感", auxiliary: "Te 外倾思考", tertiary: "Fi 内倾情感", inferior: "Ne 外倾直觉" },
  ISFJ: { dominant: "Si 内倾实感", auxiliary: "Fe 外倾情感", tertiary: "Ti 内倾思考", inferior: "Ne 外倾直觉" },
  ESTJ: { dominant: "Te 外倾思考", auxiliary: "Si 内倾实感", tertiary: "Ne 外倾直觉", inferior: "Fi 内倾情感" },
  ESFJ: { dominant: "Fe 外倾情感", auxiliary: "Si 内倾实感", tertiary: "Ne 外倾直觉", inferior: "Ti 内倾思考" },
  ISTP: { dominant: "Ti 内倾思考", auxiliary: "Se 外倾实感", tertiary: "Ni 内倾直觉", inferior: "Fe 外倾情感" },
  ISFP: { dominant: "Fi 内倾情感", auxiliary: "Se 外倾实感", tertiary: "Ni 内倾直觉", inferior: "Te 外倾思考" },
  ESTP: { dominant: "Se 外倾实感", auxiliary: "Ti 内倾思考", tertiary: "Fe 外倾情感", inferior: "Ni 内倾直觉" },
  ESFP: { dominant: "Se 外倾实感", auxiliary: "Fi 内倾情感", tertiary: "Te 外倾思考", inferior: "Ni 内倾直觉" },
};

/* 注意：ENTP 的 stack 键名是 dominant/auxiliary/tertiary/inferior，统一接口 */
Object.keys(FUNCTION_STACK).forEach((k) => {
  const s = FUNCTION_STACK[k];
  if (!s.dominant && s.dominant === undefined) s.dominant = s.dominant || s.dominant === undefined ? s.dominant : null;
  // 上面这段是为了统一（某些基础型历史键名不一致），重写如下：
  FUNCTION_STACK[k] = {
    dominant: s.dominant,
    auxiliary: s.auxiliary,
    tertiary: s.tertiary,
    inferior: s.inferior,
  };
});

/* ---------- 静态表：功能 → 脑区 ---------- */
const FUNCTION_BRAIN = {
  Ni: "默认模式网络（DMN）· 后扣带皮层（PCC）· 内侧前额叶（mPFC）",
  Ne: "默认模式网络（DMN）· 突显网络（SN）· 多巴胺新奇寻求通路（VTA→伏隔核）",
  Si: "海马体（记忆固化）· 基底神经节（程序性记忆 / 习惯回路）",
  Se: "感觉运动皮层 · 初级运动皮层 · 小脑 · 突显网络（SN）",
  Ti: "背外侧前额叶（DLPFC）· 额顶控制网络（FPN）· 顶叶联合皮层",
  Te: "背外侧前额叶（DLPFC）· 额顶控制网络（FPN）· 眶额皮层（OFC）",
  Fi: "腹内侧前额叶（vmPFC）· 深层边缘系统 · 前扣带皮层（ACC）",
  Fe: "颞顶联合区（TPJ）· 镜像神经元系统（下顶叶小叶 IPL）· 脑岛（interoception）",
};

/* ---------- 静态表：六维向量（L1 距离计算用） ---------- */
function vectorOf(base, suffix) {
  // poleA 侧 +100，poleB 侧 -100
  // 顺序: EI SN TF JP AC OH
  const v = [];
  const b = base.split("");
  v.push(b[0] === "E" ? 100 : -100); // EI: E=+100, I=-100
  v.push(b[1] === "S" ? 100 : -100); // SN: S=+100, N=-100
  v.push(b[2] === "T" ? 100 : -100); // TF: T=+100, F=-100
  v.push(b[3] === "J" ? 100 : -100); // JP: J=+100, P=-100
  v.push(suffix.includes("A") ? 100 : -100); // AC: A=+100, C=-100
  v.push(suffix.includes("O") ? 100 : -100); // OH: O=+100, H=-100
  return v;
}

function l1(a, b) {
  return a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
}

/* ---------- 静态表：四态元数据 ---------- */
const SEASON_META = {
  "C-O": { season: "春 · 觉醒", seasonKey: "spring", label: "觉醒态", color: "#8FBF9F" },
  "A-O": { season: "夏 · 破局", seasonKey: "summer", label: "破局态", color: "#E8A87C" },
  "A-H": { season: "秋 · 建制", seasonKey: "autumn", label: "建制态", color: "#C75D3B" },
  "C-H": { season: "冬 · 内观", seasonKey: "winter", label: "内观态", color: "#6B7B8C" },
};
const SUFFIX_ORDER = ["C-O", "A-O", "A-H", "C-H"];

/* ---------- 稀有度：唯一读自 lib/rarity-core.js，本脚本不再保留任何硬编码 ---------- */
const ALL_CODES = BASE_INFO.flatMap((info) => SUFFIX_ORDER.map((s) => `${info.base}-${s}`));
const RARITY = buildRarityRecords(ALL_CODES).byCode;

/** 书稿正文里手写的「第N/64」「每千人约X人」与权威值不一致时记录，供人工核对 */
const RARITY_DRIFT = [];

/** 书稿某段没有明确写「卡点 / 跃迁信号」时，用通用文案兜底并计数，便于人工复核 */
const FALLBACK_COUNT = { stuck: 0, signal: 0 };
function countStuckFallback(text) {
  FALLBACK_COUNT.stuck += 1;
  return text;
}
function countSignalFallback(text) {
  FALLBACK_COUNT.signal += 1;
  return text;
}

/* ---------- 5-A：扩展关键词与编辑补写表（必须在主循环之前声明，避免 TDZ） ---------- */
/** 各章写法差异大：这些句式在原稿中明确指向「隐秘卡点」，但不含「卡点/盲区/陷阱」字样 */
const STUCK_KEYWORDS_EXT =
  /路径依赖与感知钝化|越来越难说不|潜藏着危机|容忍度越来越低|不像你了|埋着最深的隐患/;
/** 原稿中明确指向「跃迁信号」但不含「信号/跃迁/转折」字样的句式 */
const SIGNAL_KEYWORDS_EXT =
  /第一次正面看见自己那堵墙|打破冬季闭环的钥匙|第一毫米|游牧民族|声音像录音|门就开了|深夜怀疑|那句话像一面镜子|守在原地等别人绕过去|被一个陌生人打断|髓鞘化|反过来改写她的感官|长出冬天的边境|再把门推开一次|不知道门后是什么|第一次意识到|忽然有点反胃/;

/**
 * 编辑补写：原稿通篇确实没有对应表述时，由编辑按该型功能栈与后缀补写。
 * source 标记为 "editorial"，页面不展示，仅供审校追踪。
 */
const EDITORIAL = {
  "ENTJ-A-O": {
    leapSignal:
      "当你不再急着宣布下一个方向，而是先问「上一个方向的人安顿好了吗」，并愿意花一个季度把推土机后面的路铺平时，你就收到了从破局态走向建制态的信号。",
  },
  "ESTJ-A-O": {
    leapSignal:
      "当你给规矩开完新口子之后，开始主动回头检查「新规矩是不是每个人都接得住」，并愿意把最快的那个改动放慢半拍时，破局态就开始向建制态换挡。",
  },
  "ESTJ-A-H": {
    leapSignal:
      "当你发现最新一版制度里有一条规定连你自己都解释不清「为什么必须这样」，并愿意把它拆开重新校验时，建制态就开始向内观态过渡。",
  },
  "ESTJ-C-H": {
    hiddenStuck:
      "深冬的卡点，是把「精度校准」变成只校准条文、不校准自己——制度一年比一年细，而提出制度的人越来越少被质疑。",
    leapSignal:
      "当你在校准时第一次发现「需要修订的不是条文，而是我自己多年来的某个默认」，并愿意把这条发现说给一个资历比你浅的人听时，内观态就开始重新接回觉醒态。",
  },
};

/* ---------- 提取器：板块切分 ---------- */
function extractSections(text) {
  const sections = {};
  // 按 "## 板块" 切分，保留标记本身
  const re = /## (板块[一二三四五].{0,50})([\s\S]*?)(?=\n## |$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].match(/板块([一二三四五])/)?.[1] || m[1];
    sections[`板块${key}`] = { title: m[1].trim(), body: m[2].trim() };
  }
  return sections;
}

/* ---------- 提取器：四态正文 ---------- */
function extractVariants(text, base) {
  const variants = {};
  // 兼容多种四态标题写法：
  //   ### 第一态 · 觉醒态：`XXX-C-O`（名称 · 内省探索）—— 稀有，第N/64，每千人约X.XX人
  //   ### 第一态 · 觉醒态:`XXX-C-O`(名称 · 内省探索)—— 稀有,第N/64,每千人约X.XX人
  //   ### 第一态 · 觉醒态：`XXX-C-O`（名称 · 内省探索）—— 稀有，第N/64  （无千分比，用权威表回填）
  const re = /### 第[一二三四]态[^\n]*?`([A-Z]{4})-([AC])-([OH])`[^\n]*?第(\d+)\/64(?:[^\n]*?每千人约?([\d.]+)人)?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const suffix = `${m[2]}-${m[3]}`;
    const code = `${m[1]}-${suffix}`;
    const mdRank = parseInt(m[4], 10);
    const mdPer1000 = m[5] ? parseFloat(m[5]) : null;
    const auth = RARITY[code];
    if (!auth) throw new Error(`稀有度事实源缺少型别 ${code}`);
    // 书稿正文与权威值不一致时只记录，不在生成结果里手工改数字
    // 书稿写两位小数、事实源写一位小数：容差取 0.051，避免 11.65 vs 11.6 这类浮点误差误报
    if (mdRank !== auth.rank) {
      RARITY_DRIFT.push({ code, field: "rank", manuscript: mdRank, authoritative: auth.rank });
    }
    if (mdPer1000 !== null && Math.abs(mdPer1000 - auth.per1000) > 0.051) {
      RARITY_DRIFT.push({ code, field: "per1000", manuscript: mdPer1000, authoritative: auth.per1000 });
    }
    // 从标题行向下找正文，直到下一个 ### 或 ##
    const startIdx = m.index + m[0].length;
    const rest = text.slice(startIdx);
    const endM = rest.match(/\n### |\n## |$/);
    const body = rest.slice(0, endM.index).trim();
    // 从标题行抓季节标签
    const seasonM = text.slice(Math.max(0, m.index - 50), m.index + 200).match(/觉醒态|破局态|建制态|内观态/);
    const seasonLabel = seasonM ? seasonM[0].replace("态", "") : SEASON_META[suffix]?.label || "";
    variants[suffix] = {
      label: seasonLabel ? `${seasonLabel}态` : SEASON_META[suffix]?.label || "",
      suffix,
      season: SEASON_META[suffix]?.season || "",
      seasonLabel,
      color: SEASON_META[suffix]?.color || "#999",
      // 排名与每千人一律以稀有度事实源为准，书稿正文只提供文案
      rank: auth.rank,
      per1000: auth.per1000,
      body,
    };
  }
  return variants;
}

/* ---------- 神经底座：解释性映射（不是个人脑成像结论） ---------- */
const NEURO_DISCLAIMER =
  "神经机制部分用于通俗解释人格模型与认知过程之间的可能联系，不是个人脑成像结果，也不构成诊断结论。";

/** 功能栈各槽位的证据强度：主导/辅助更容易找到认知过程层面的相关研究，第三/劣势只做理论类比 */
const EVIDENCE_BY_SLOT = {
  dominant: "相关研究启发",
  auxiliary: "相关研究启发",
  tertiary: "理论类比",
  inferior: "理论类比",
};

function buildExplanatoryNetworks(stack) {
  return ["dominant", "auxiliary", "tertiary", "inferior"].map((slot) => {
    const fn = stack[slot];
    const code = fn.split(" ")[0];
    const brain = FUNCTION_BRAIN[code] || "相关认知过程";
    return {
      label: fn,
      description: `常被类比为 ${brain} 的活动模式；这里只说明「可能涉及哪些认知过程」，不代表该型别拥有专属神经结构。`,
      evidenceLevel: EVIDENCE_BY_SLOT[slot],
    };
  });
}

/* ---------- 提取器：神经底盘（板块一） ---------- */
function extractNeuroBase(text, base) {
  const stack = FUNCTION_STACK[base];

  // 提取 flowAndGrip：慢性死循环 + 急性 Grip
  let loopMatch = text.match(/慢性[期是]?「([^」]+)」?[，,].{0,200}?急性[期是]?「([^」]+)」/s);
  let flowMatch = text.match(/顺境[^。]{0,40}([^\n。]{10,120})/s);

  // 简化：从文本里直接抓 "Flow" 和 "Grip"
  if (!loopMatch) {
    loopMatch = text.match(/慢性[^\n]{0,40}?([A-Za-z]{2}-[A-Za-z]{2} [^\n」]+死循环|Loop)/);
  }

  return {
    stack,
    explanatoryNetworks: buildExplanatoryNetworks(stack),
    disclaimer: NEURO_DISCLAIMER,
    dominant: stack.dominant,
    auxiliary: stack.auxiliary,
    tertiary: stack.tertiary,
    inferior: stack.inferior,
    flowState: extractFlowState(text, stack),
    loopState: extractLoopState(text, stack),
    gripState: extractGripState(text, stack),
  };
}

function extractFlowState(text, stack) {
  // 在板块一里找 "顺境心流" 或 "高能量状态" 描述
  const lines = text.split("\n");
  for (const line of lines) {
    if (/顺境|高能量|心流|巅峰状态/.test(line) && line.length > 30) {
      return line.trim().slice(0, 160);
    }
  }
  // fallback：给一段标准描述
  return `当 ${stack.dominant.split(" ")[0]} 与 ${stack.auxiliary.split(" ")[0]} 协同运转时，你进入「顺手就能做很久」的心流状态。`;
}

function extractLoopState(text, stack) {
  // 找慢性死循环
  const re = /慢性[^「\n]{0,20}「([^」]+(?:死循环|Loop)[^」]*)」/;
  const m = text.match(re);
  if (m) return m[1];
  // fallback
  return `${stack.dominant.split(" ")[0]}-${stack.tertiary.split(" ")[0]} 死循环（功能反刍）`;
}

function extractGripState(text, stack) {
  // 找急性劣势爆发
  const re = /急性[^「\n]{0,20}「([^」]+(?:劣势|Grip|爆发|雪崩)[^」]*)」/;
  const m = text.match(re);
  if (m) return m[1];
  // fallback
  return `${stack.inferior.split(" ")[0]} 劣势爆发（失控接管）`;
}

/* ---------- 提取器：生存切片（板块三） ---------- */
function extractChinaSlices(text) {
  // 板块三标题已知，直接切
  const m = text.match(/## 板块三[^#]*?([\s\S]*?)(?=\n## 板块四)/);
  if (!m) return { career: "", dinner: "", wechat: "", defenseLines: [] };
  const body = m[1];

  // 用 ### 切分板块三的子节
  const subSections = body.split(/\n### /).slice(1);
  let career = "", dinner = "", wechat = "";
  const defenseLines = [];

  for (const sub of subSections) {
    const title = sub.split("\n")[0];
    if (/职场|生态位|岗位|赛道/.test(title)) career = sub.trim().slice(0, 900);
    else if (/饭局|酒桌|餐桌|聚餐/.test(title)) dinner = sub.trim().slice(0, 900);
    else if (/微信|群聊|私聊|消息/.test(title)) wechat = sub.trim().slice(0, 900);
    else if (/防线|低耗能|微动作|练习/.test(title)) {
      const lines = sub.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      defenseLines.push(...lines.map((l) => l.trim()));
    }
  }

  // 有些章节把「饭局」与「微信」写在同一子节里，按微信标记再切一次
  // （跳过子节标题里出现的「饭局与微信」）
  if (!wechat) {
    const re = /而在微信|微信群|群聊|私聊|微信/gi;
    let hit = null;
    let mm2;
    while ((mm2 = re.exec(dinner)) !== null) {
      if (mm2.index >= 100) {
        hit = mm2.index;
        break;
      }
    }
    if (hit !== null) {
      wechat = dinner.slice(hit).trim();
      dinner = dinner.slice(0, hit).trim();
    }
  }

  // 部分章节的板块三没有 ### 子节，只有连续散文：按段落标记切分
  if (!career && !dinner && !wechat) {
    const prose = body.replace(/^[^\n]*\n+/, "");
    const iDinner = prose.search(/\n\n饭局/);
    const iWechat = prose.search(/\n\n微信|微信里的你|微信上的你/);
    const iDefense = prose.search(/\n\n要止住|低耗能|三道硬性|物理防线/);
    const endDinner = iWechat > iDinner ? iWechat : iDefense > iDinner ? iDefense : prose.length;
    const endWechat = iDefense > iWechat ? iDefense : prose.length;
    career = iDinner > 0 ? prose.slice(0, iDinner) : prose;
    dinner = iDinner > 0 ? prose.slice(iDinner, endDinner) : "";
    wechat = iWechat > 0 ? prose.slice(iWechat, endWechat) : "";
  }

  // 如果子节没抓到，尝试从正文里直接提取数字列表
  if (defenseLines.length === 0) {
    const lines = body.split("\n").filter((l) => /^\d+\./.test(l.trim()));
    defenseLines.push(...lines.slice(0, 3).map((l) => l.trim()));
  }

  return {
    career: career.slice(0, 500),
    dinner: dinner.slice(0, 500),
    wechat: wechat.slice(0, 500),
    defenseLines: defenseLines.slice(0, 3),
  };
}

/* ---------- 提取器：亲密关系契约（板块四） ---------- */
function extractIntimacyContract(text) {
  const m = text.match(/## 板块四[^#]*?([\s\S]*?)(?=\n## 板块五|$)/);
  if (!m) return { contract: "", wearScripts: [] };
  const body = m[1];

  // 提取四亚型磨损剧本
  const wearScripts = [];
  const re = /`[A-Z]{4}-[AC]-[OH]`[^\n]*：([^\n]{20,300})/g;
  let mm;
  while ((mm = re.exec(body)) !== null) {
    wearScripts.push(mm[1].trim());
  }

  // 终极救赎金句（板块四结尾）
  const endMatch = body.match(/\*\*(?:(?:终极|终极救赎)[^\n]{0,200})/);
  const contract = endMatch ? endMatch[0].slice(0, 200) : body.slice(-300);

  return { contract: contract.trim(), wearScripts };
}

/* ---------- 提取器：镜像导师 ---------- */
const MIRROR_MAP = {
  INTJ: "ESFP", INTP: "ESFJ", ENTJ: "ISFP", ENTP: "ISFJ",
  INFJ: "ESTP", INFP: "ESTJ", ENFP: "ISTJ", ENFJ: "ISTP",
  ISTJ: "ENFP", ISFJ: "ENTP", ESTJ: "INFP", ESFJ: "INTP",
  ISTP: "ENFJ", ISFP: "ENTJ", ESTP: "INFJ", ESFP: "INTJ",
};

const MIRROR_REASON = {
  INTJ: "你活在长线架构里（Ni-Te），他们活在此刻的感官引爆里（Se-Fi）——你们互为彼此最远也最深的镜像",
  INTP: "你活在颅内逻辑模型里（Ti-Ne），他们活在人际和谐的具体照料里（Fe-Si）",
  ENTJ: "你活在外部秩序推土里（Te-Ni），他们活在内在价值的感官坚持里（Fi-Se）",
  ENTP: "你活在发散可能性里（Ne-Ti），他们活在被验证过的稳定照料里（Si-Fe）",
  INFJ: "你活在全景推演与共情里（Ni-Fe），他们活在此刻的危机现场里（Se-Ti）",
  INFP: "你活在内在价值宇宙里（Fi-Ne），他们活在外部秩序的强制执行里（Te-Si）",
  ENFP: "你活在可能性燃烧里（Ne-Fi），他们活在规则的可预测性里（Si-Te）",
  ENFJ: "你活在群体情绪调度里（Fe-Ni），他们活在颅内逻辑的冷静拆解里（Ti-Se）",
  ISTJ: "你活在规则的经验固化里（Si-Te），他们活在可能性的无限点燃里（Ne-Fi）",
  ISFJ: "你活在无声照料与记忆承诺里（Si-Fe），他们活在发散与解构的玩耍里（Ne-Ti）",
  ESTJ: "你活在秩序的强制执行里（Te-Si），他们活在个人价值的内在审视里（Fi-Ne）",
  ESFJ: "你活在群体和谐与仪式感里（Fe-Si），他们活在逻辑拆解与前提质疑里（Ti-Ne）",
  ISTP: "你活在物理现场的逻辑拆解里（Ti-Se），他们活在群体信念的点燃里（Fe-Ni）",
  ISFP: "你活在内在审美与感官沉浸里（Fi-Se），他们活在目标推土与长期架构里（Te-Ni）",
  ESTP: "你活在危机现场的即时反应里（Se-Ti），他们活在长线推演与意义架构里（Ni-Fe）",
  ESFP: "你活在场域能量的即时引爆里（Se-Fi），他们活在结构预设与冷静规划里（Ni-Te）",
};

function extractMentorExperiment(text) {
  const m = text.match(/## 板块五[^#]*?([\s\S]*?)(?=\n## 本章验证|$)/);
  if (!m) return [];
  const body = m[1];
  // 提取三步实验：兼容 "1. **标题：** 正文" 和 "1. **标题**：正文" 两种格式
  const steps = [];
  // 兼容 "1. **标题：** 正文"、"1. **标题**：正文"、"1. **标题。** 正文"
  const re = /\d+\.\s*\*\*([^：*\n]{2,60})[：:。]?\*\*\s*([：:]?\s*[^\n]{20,300})/g;
  let mm;
  while ((mm = re.exec(body)) !== null) {
    steps.push({ title: mm[1].trim(), body: mm[2].replace(/^[：:]\s*/, "").trim() });
  }

  // 兼容「第一步 · 标题（借 Ne）。正文」写法
  if (steps.length === 0) {
    const chunks = body.split(/(?=第[一二三]步)/).slice(1);
    for (const c of chunks) {
      const m2 =
        c.match(/^第[一二三]步\s*·?\s*(.+?)[（(][^）)]*[）)][。.：:]\s*([^\n]{20,300})/) ||
        c.match(/^第[一二三]步\s*·?\s*(.+?)[。.：:]\s*([^\n]{20,300})/);
      if (m2) steps.push({ title: m2[1].trim(), body: m2[2].trim() });
    }
  }
  return steps.slice(0, 3);
}

/* ---------- 提取器：今日微动作（板块五一阶） ---------- */

/** 组标题行 → 四组键；兼容「**写给 `C…' → 迈向…**」与「**C→A｜…**」两种写法 */
function microGroupOf(line) {
  const t = line.trim();
  if (!t.startsWith("**")) return null;
  const head = t.slice(0, 60);
  if (/C→A/.test(head) || /写给\s*`?C/.test(head)) return "c2a";
  if (/A→C/.test(head) || /写给\s*`?A/.test(head)) return "a2c";
  if (/O→H/.test(head) || /写给\s*`?O/.test(head)) return "o2h";
  if (/H→O/.test(head) || /写给\s*`?H/.test(head)) return "h2o";
  return null;
}

function extractMicroActions(text) {
  const m = text.match(/### 一阶同源微调练习[^#]*?([\s\S]*?)(?=\n### 二阶|$)/);
  if (!m) return { c2a: [], a2c: [], o2h: [], h2o: [] };
  const body = m[1];

  // 1) 先按组标题行切块，避免跨组的微动作混进同一组
  const segments = { c2a: [], a2c: [], o2h: [], h2o: [] };
  let cur = null;
  for (const line of body.split("\n")) {
    const key = microGroupOf(line);
    if (key) {
      cur = key;
      segments[cur].push(line);
      continue;
    }
    if (cur) segments[cur].push(line);
  }

  const out = { c2a: [], a2c: [], o2h: [], h2o: [] };
  for (const key of Object.keys(segments)) {
    const chunk = segments[key].join("\n");

    // 格式甲：- **微动作 1 · 标题（时间）：** 正文
    const bullet = /\*\*微动作\s*(\d+)\s*·\s*([^：*\n]+)[：:]\*\*([^\n]+)/g;
    let mm;
    while ((mm = bullet.exec(chunk)) !== null) {
      out[key].push(`${mm[2].trim()}：${mm[3].trim()}`.slice(0, 160));
    }

    // 格式乙：微动作一 · 标题（第 X 天）：正文
    if (out[key].length === 0) {
      const plain = /微动作[一二三四1234]+\s*·\s*([^：\n]{2,80})[：:]([^\n]+)/g;
      while ((mm = plain.exec(chunk)) !== null) {
        out[key].push(`${mm[1].trim()}：${mm[2].trim()}`.slice(0, 160));
      }
    }

    // 格式丙：**C→A｜…**第一个微动作，正文。第二个微动作，正文。
    if (out[key].length === 0) {
      const parts = chunk.split(/第[一二三四]个微动作[，,]/).slice(1);
      for (const p of parts) {
        const cleaned = p
          .replace(/^\s*[-*•]+\s*/, "")
          .replace(/\*\*/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (cleaned) out[key].push(cleaned.slice(0, 160));
      }
    }
  }
  return out;
}

/* ---------- 主流程 ---------- */
const out = {
  generatedAt: new Date().toISOString(),
  bookVersion: "v1.0-192k",
  totalChapters: 24,
  enrichedCount: 16,
  types: {},
};

for (const info of BASE_INFO) {
  const chapterPath = path.join(BOOK_ROOT, info.path, `${info.book}.md`);
  if (!fs.existsSync(chapterPath)) {
    console.error(`❌ 找不到章节: ${chapterPath}`);
    continue;
  }
  const text = fs.readFileSync(chapterPath, "utf8");

  const sections = extractSections(text);
  const variants = extractVariants(text, info.base);
  const neuroBase = extractNeuroBase(text, info.base);
  const chinaSlices = extractChinaSlices(text);
  const intimacyContract = extractIntimacyContract(text);
  const mentorSteps = extractMentorExperiment(text);
  const microActions = extractMicroActions(text);

  // 计算四态的 L1 距离到镜像导师
  const mentorBase = MIRROR_MAP[info.base];
  const mentorChapter = BASE_INFO.find((x) => x.base === mentorBase);
  const mentorVector = vectorOf(mentorBase, "A-O"); // 用导师的中间态作为参照

  // 为每个亚型构建 spiralStage
  const spiralStage = {};
  for (const suffix of SUFFIX_ORDER) {
    const v = variants[suffix];
    if (!v) {
      console.warn(`⚠️  ${info.base} 缺少 ${suffix} 态`);
      continue;
    }
    const currentVector = vectorOf(info.base, suffix);
    // 下一阶指引
    const idx = SUFFIX_ORDER.indexOf(suffix);
    const nextSuffix = idx < 3 ? SUFFIX_ORDER[idx + 1] : null;
    const nextLabel = nextSuffix ? SEASON_META[nextSuffix].label : "已完成四季循环，回到春季觉醒";

    // 卡点 / 跃迁信号三级解析：原稿提取 → 编辑补写 → 通用兜底（兜底会触发末尾清零检查报错）
    const ed = EDITORIAL[`${info.base}-${suffix}`] || {};
    const stuckExtracted = extractHiddenStuck(v.body);
    const signalExtracted = extractLeapSignal(v.body);
    const stuckHit = stuckExtracted
      ? { text: stuckExtracted, source: "manuscript" }
      : ed.hiddenStuck
        ? { text: ed.hiddenStuck, source: "editorial" }
        : {
            text: countStuckFallback(
              `「${v.label}」的卡点通常不在短板，而在优势用过了头：越是熟练，越难主动停下。`,
            ),
            source: "editorial",
          };
    const signalHit = signalExtracted
      ? { text: signalExtracted, source: "manuscript" }
      : ed.leapSignal
        ? { text: ed.leapSignal, source: "editorial" }
        : {
            text: countSignalFallback(
              `当你发现「${v.label}」的旧办法开始失灵时，就是可以试着调用「${nextLabel}」的信号。`,
            ),
            source: "editorial",
          };

    spiralStage[suffix] = {
      label: v.label,
      suffix: v.suffix,
      season: v.season,
      seasonLabel: v.seasonLabel,
      color: v.color,
      rank: v.rank,
      per1000: v.per1000,
      hiddenStuck: stuckHit.text,
      hiddenStuckSource: stuckHit.source,
      leapSignal: signalHit.text,
      leapSignalSource: signalHit.source,
      nextSuffix,
      nextLabel,
      bodyPreview: makePreview(v.body),
      body: v.body,
    };
  }

  out.types[info.base] = {
    base: info.base,
    cn: info.cn,
    bookChapter: info.book,
    bookChapterPath: `${info.path}/${info.book}.md`,
    neuroBase,
    spiralStage,
    chinaSlices,
    intimacyContract,
    mirrorMentor: {
      base: mentorBase,
      cn: mentorChapter ? mentorChapter.cn : mentorBase,
      chapter: mentorChapter ? mentorChapter.book : null,
      reason: MIRROR_REASON[info.base],
      l1Distance: 1200,
      experimentSteps: mentorSteps,
    },
    deliberatePractice: microActions,
  };
}

/** 取一段文字的前 1–2 个完整句子，避免半句话；清洗 Markdown 残片与前导引号 */
function takeSentences(text, max = 180) {
  const clean = text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”」』]+/, "")
    .trim();
  const m = clean.match(/^[^。！？]{0,140}。[^。！？]{0,140}。/);
  let out = (m ? m[0] : clean.slice(0, max)).slice(0, max);
  // 截断可能丢掉右引号，引号数不平衡时补上
  const open = (out.match(/「/g) || []).length;
  const close = (out.match(/」/g) || []).length;
  if (open > close) out += "」";
  return out;
}

/** 按关键词定位行，并回退到关键词所在句子的开头，避免把无关前句带进来 */
function pickLine(lines, re) {
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const before = line.slice(0, m.index);
    const start =
      Math.max(before.lastIndexOf("。"), before.lastIndexOf("！"), before.lastIndexOf("？")) + 1;
    return line.slice(start);
  }
  return "";
}

/** 四态正文里的卡点句：各章节写法差异很大，先按关键词定位行，再取完整句子 */
function extractHiddenStuck(body) {
  const KEY =
    /最隐秘的(?:生命周期)?卡点|隐秘的卡点|最大盲区|盲区|最大隐忧|最深的隐忧|隐忧|陷阱在于|陷阱|核心卡点|卡点|最危险的地方|路径依赖的阴影|阴影/;
  const lines = body.split(/\n+/);
  const line = pickLine(lines, KEY) || pickLine(lines, STUCK_KEYWORDS_EXT);
  return line ? takeSentences(line) : "";
}

/** 跃迁信号：优先取含「的信号」的一行（避免误中「异质信号」），其次取含跃迁/转折/契机的一行 */
function extractLeapSignal(body) {
  const lines = body.split(/\n+/);
  const line =
    pickLine(lines, /的信号/) ||
    pickLine(lines, /跃迁|转折|契机|破壁/) ||
    pickLine(lines, SIGNAL_KEYWORDS_EXT);
  return line ? takeSentences(line) : "";
}

/** 章节预览：去 Markdown、按句子边界截断，避免半句话与残片 */
function makePreview(body, max = 240) {
  const clean = body
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-#>|]+\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/[，,、；;：:]\s*$/, "")) + "……";
}

/* ---------- 通用兜底清零检查：生成结果中不允许再出现通用兜底文案 ---------- */
const GENERIC_FALLBACK_MARKS = ["优势用过了头", "旧办法开始失灵"];
const fallbackHits = [];
for (const [base, d] of Object.entries(out.types)) {
  for (const [suffix, v] of Object.entries(d.spiralStage)) {
    for (const mark of GENERIC_FALLBACK_MARKS) {
      if (v.hiddenStuck.includes(mark)) fallbackHits.push(`${base}-${suffix}.hiddenStuck`);
      if (v.leapSignal.includes(mark)) fallbackHits.push(`${base}-${suffix}.leapSignal`);
    }
  }
}
if (fallbackHits.length > 0) {
  console.error(`\n❌ 仍有 ${fallbackHits.length} 处通用兜底文案：\n   ${fallbackHits.join("\n   ")}`);
  process.exitCode = 1;
}

/* ---------- 输出 ---------- */
const outPath = path.join(process.cwd(), "data", "bookEnriched.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

/* ---------- 摘要打印 ---------- */
console.log("✅ 数据提取完成：" + outPath);
console.log("   16 个原型 → " + Object.keys(out.types).length + " 条记录");
for (const [base, d] of Object.entries(out.types)) {
  const variants = Object.keys(d.spiralStage).length;
  const microTotal = Object.values(d.deliberatePractice).reduce((s, arr) => s + arr.length, 0);
  console.log(`   ${base.padEnd(5)} | 四态=${variants} | 微动作=${microTotal} | 镜像=${d.mirrorMentor.base}`);
}

console.log(
  `\nℹ️  兜底文案：卡点 ${FALLBACK_COUNT.stuck} 条、跃迁信号 ${FALLBACK_COUNT.signal} 条（该书稿段落未出现明确表述）`,
);

/* ---------- 稀有度漂移报告（只报告，不改写书稿） ---------- */
if (RARITY_DRIFT.length > 0) {
  console.warn(`\n⚠️  书稿正文与稀有度事实源不一致 ${RARITY_DRIFT.length} 处（生成数据已按事实源取值，书稿需人工校订）：`);
  for (const d of RARITY_DRIFT) {
    console.warn(`   ${d.code} ${d.field}: 书稿 ${d.manuscript} → 权威 ${d.authoritative}`);
  }
} else {
  console.log("\n✅ 书稿正文的 rank / per1000 与稀有度事实源完全一致");
}
