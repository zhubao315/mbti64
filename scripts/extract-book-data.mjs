/**
 * 书稿 → 网站数据提取脚本
 * 解析 16 个原型章节 Markdown，生成结构化 bookEnriched.json
 */

import fs from "node:fs";
import path from "node:path";

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

/* ---------- 权威稀有度表（与 DIM_PRIOR 完全一致） ---------- */
const RARITY_AUTH = {
  "INTJ-C-O": { rank: 3, per1000: 7.80 }, "INTJ-A-O": { rank: 19, per1000: 11.69 }, "INTJ-A-H": { rank: 27, per1000: 14.29 }, "INTJ-C-H": { rank: 9, per1000: 9.53 },
  "INTP-C-O": { rank: 1, per1000: 5.79 }, "INTP-A-O": { rank: 13, per1000: 9.53 }, "INTP-A-H": { rank: 15, per1000: 10.14 }, "INTP-C-H": { rank: 5, per1000: 6.75 },
  "ENTJ-C-O": { rank: 21, per1000: 11.69 }, "ENTJ-A-O": { rank: 25, per1000: 14.29 }, "ENTJ-A-H": { rank: 39, per1000: 17.47 }, "ENTJ-C-H": { rank: 33, per1000: 14.29 },
  "ENTP-C-O": { rank: 3, per1000: 7.80 }, "ENTP-A-O": { rank: 13, per1000: 9.53 }, "ENTP-A-H": { rank: 27, per1000: 14.29 }, "ENTP-C-H": { rank: 9, per1000: 9.53 },
  "INFJ-C-O": { rank: 3, per1000: 7.80 }, "INFJ-A-O": { rank: 19, per1000: 11.69 }, "INFJ-A-H": { rank: 27, per1000: 14.29 }, "INFJ-C-H": { rank: 9, per1000: 9.53 },
  "INFP-C-O": { rank: 2, per1000: 6.38 }, "INFP-A-O": { rank: 17, per1000: 10.14 }, "INFP-A-H": { rank: 23, per1000: 12.34 }, "INFP-C-H": { rank: 7, per1000: 8.51 },
  "ENFP-C-O": { rank: 3, per1000: 7.80 }, "ENFP-A-O": { rank: 13, per1000: 9.53 }, "ENFP-A-H": { rank: 27, per1000: 14.29 }, "ENFP-C-H": { rank: 9, per1000: 9.53 },
  "ENFJ-C-O": { rank: 17, per1000: 10.14 }, "ENFJ-A-O": { rank: 25, per1000: 14.29 }, "ENFJ-A-H": { rank: 39, per1000: 17.47 }, "ENFJ-C-H": { rank: 31, per1000: 13.82 },
  "ISTJ-C-O": { rank: 33, per1000: 14.48 }, "ISTJ-A-O": { rank: 51, per1000: 21.72 }, "ISTJ-A-H": { rank: 57, per1000: 26.54 }, "ISTJ-C-H": { rank: 41, per1000: 17.70 },
  "ISFJ-C-O": { rank: 34, per1000: 14.48 }, "ISFJ-A-O": { rank: 52, per1000: 21.72 }, "ISFJ-A-H": { rank: 58, per1000: 26.54 }, "ISFJ-C-H": { rank: 42, per1000: 17.70 },
  "ESTJ-C-O": { rank: 45, per1000: 17.70 }, "ESTJ-A-O": { rank: 61, per1000: 26.54 }, "ESTJ-A-H": { rank: 63, per1000: 32.44 }, "ESTJ-C-H": { rank: 49, per1000: 21.63 },
  "ESFJ-C-O": { rank: 46, per1000: 17.70 }, "ESFJ-A-O": { rank: 62, per1000: 26.54 }, "ESFJ-A-H": { rank: 64, per1000: 32.44 }, "ESFJ-C-H": { rank: 50, per1000: 21.63 },
  "ISTP-C-O": { rank: 25, per1000: 11.85 }, "ISTP-A-O": { rank: 47, per1000: 17.77 }, "ISTP-A-H": { rank: 53, per1000: 21.72 }, "ISTP-C-H": { rank: 35, per1000: 14.48 },
  "ISFP-C-O": { rank: 26, per1000: 11.85 }, "ISFP-A-O": { rank: 48, per1000: 17.77 }, "ISFP-A-H": { rank: 54, per1000: 21.72 }, "ISFP-C-H": { rank: 36, per1000: 14.48 },
  "ESTP-C-O": { rank: 37, per1000: 14.48 }, "ESTP-A-O": { rank: 55, per1000: 21.72 }, "ESTP-A-H": { rank: 59, per1000: 26.54 }, "ESTP-C-H": { rank: 43, per1000: 17.70 },
  "ESFP-C-O": { rank: 38, per1000: 14.48 }, "ESFP-A-O": { rank: 56, per1000: 21.72 }, "ESFP-A-H": { rank: 57, per1000: 26.54 }, "ESFP-C-H": { rank: 44, per1000: 17.70 },
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
    const rank = parseInt(m[4], 10);
    const per1000 = m[5] ? parseFloat(m[5]) : null;
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
      rank,
      per1000: per1000 ?? RARITY_AUTH[code]?.per1000 ?? 0,
      body,
    };
  }
  return variants;
}

/* ---------- 提取器：神经底盘（板块一） ---------- */
function extractNeuroBase(text, base) {
  const stack = FUNCTION_STACK[base];
  // 从板块一提取所有脑区标签
  const brainHits = new Set();
  const brainRe = /([\u4e00-\u9fa5A-Za-z]+(?:区|叶|核|网络|系统|皮层|沟|束))/g;
  let m;
  while ((m = brainRe.exec(text)) !== null) brainHits.add(m[1]);

  // 提取 flowAndGrip：慢性死循环 + 急性 Grip
  let loopMatch = text.match(/慢性[期是]?「([^」]+)」?[，,].{0,200}?急性[期是]?「([^」]+)」/s);
  let flowMatch = text.match(/顺境[^。]{0,40}([^\n。]{10,120})/s);

  // 简化：从文本里直接抓 "Flow" 和 "Grip"
  if (!loopMatch) {
    loopMatch = text.match(/慢性[^\n]{0,40}?([A-Za-z]{2}-[A-Za-z]{2} [^\n」]+死循环|Loop)/);
  }

  return {
    stack,
    brainRegions: Array.from(brainHits).slice(0, 8),
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
    if (/职场|生态位|岗位|赛道/.test(title)) career = sub.trim().slice(0, 500);
    else if (/饭局|酒桌|餐桌|聚餐/.test(title)) dinner = sub.trim().slice(0, 500);
    else if (/微信|群聊|私聊|消息/.test(title)) wechat = sub.trim().slice(0, 500);
    else if (/防线|低耗能|微动作|练习/.test(title)) {
      const lines = sub.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      defenseLines.push(...lines.map((l) => l.trim()));
    }
  }

  // 如果子节没抓到，尝试从正文里直接提取数字列表
  if (defenseLines.length === 0) {
    const lines = body.split("\n").filter((l) => /^\d+\./.test(l.trim()));
    defenseLines.push(...lines.slice(0, 3).map((l) => l.trim()));
  }

  return { career, dinner, wechat, defenseLines: defenseLines.slice(0, 3) };
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
  const re = /\d+\.\s*\*\*([^：]+)[:：]\*\*\s*([^\n]{20,300})/g;
  let mm;
  while ((mm = re.exec(body)) !== null) {
    steps.push({ title: mm[1].trim(), body: mm[2].trim() });
  }
  return steps.slice(0, 3);
}

/* ---------- 提取器：今日微动作（板块五一阶） ---------- */
function extractMicroActions(text) {
  const m = text.match(/### 一阶同源微调练习[^#]*?([\s\S]*?)(?=\n### 二阶|$)/);
  if (!m) return { c2a: [], a2c: [], o2h: [], h2o: [] };
  const body = m[1];
  const groups = { c2a: [], a2c: [], o2h: [], h2o: [] };
  let cur = null;
  const lines = body.split("\n");
  for (const line of lines) {
    // 兼容两种格式：
    //   **写给 `C（内省）` 偏高者 → 迈向「坚定态（→A）」的脱敏训练**
    //   **C→A｜从内省探索到坚定探索。**
    if (/C→A|写给.*C.*迈向.*A|C（内省）.*迈向.*坚定/i.test(line)) {
      cur = "c2a";
      if (/第一个微动作/.test(line)) groups[cur].push(line.replace(/^[\s*\-•]+/, "").trim().slice(0, 120));
    }
    else if (/A→C|写给.*A.*迈向.*C|A（坚定）.*迈向.*内省/i.test(line)) {
      cur = "a2c";
      if (/第一个微动作/.test(line)) groups[cur].push(line.replace(/^[\s*\-•]+/, "").trim().slice(0, 120));
    }
    else if (/O→H|写给.*O.*迈向.*H|O（探索）.*迈向.*守成/i.test(line)) {
      cur = "o2h";
      if (/第一个微动作/.test(line)) groups[cur].push(line.replace(/^[\s*\-•]+/, "").trim().slice(0, 120));
    }
    else if (/H→O|写给.*H.*迈向.*O|H（守成）.*迈向.*探索/i.test(line)) {
      cur = "h2o";
      if (/第一个微动作/.test(line)) groups[cur].push(line.replace(/^[\s*\-•]+/, "").trim().slice(0, 120));
    }
    else if (cur && (/微动作/.test(line) || /第一个微动作|第二个微动作/.test(line))) {
      groups[cur].push(line.replace(/^[\s*\-•]+/, "").trim().slice(0, 120));
    }
  }
  return groups;
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

    spiralStage[suffix] = {
      label: v.label,
      suffix: v.suffix,
      season: v.season,
      seasonLabel: v.seasonLabel,
      color: v.color,
      rank: v.rank,
      per1000: v.per1000,
      hiddenStuck: extractHiddenStuck(v.body),
      leapSignal: extractLeapSignal(v.body, nextSuffix),
      nextSuffix,
      nextLabel,
      bodyPreview: v.body.slice(0, 220) + "……",
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

function extractHiddenStuck(body) {
  const m = body.match(/最隐秘的生命周期卡点[^。]{0,200}|最隐秘[^。]{10,120}。/);
  return m ? m[0].slice(0, 120) : "";
}

function extractLeapSignal(body, nextSuffix) {
  const m = body.match(/跃迁的契机[^。]{0,120}|当你开始[^。]{10,120}|跃迁信号[^。]{10,120}/);
  return m ? m[0].slice(0, 120) : `当你准备好从「${SEASON_META[SUFFIX_ORDER[SUFFIX_ORDER.indexOf(nextSuffix) - 1]]?.label || "当前态"}」迈向「${SEASON_META[nextSuffix]?.label || "下一阶"}」时，一个微小但不可逆的行为改变会发生。`;
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
