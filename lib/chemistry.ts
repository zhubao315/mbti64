import { DIMS, DIM_ORDER, type DimKey, type DimScore } from "@/data/schema";
import { l1Distance, vectorFromCode, vectorFromDims } from "@/lib/match";
import { getType, type Type64 } from "@/data/types64";

/**
 * 双人合盘引擎（Relationship Chemistry）
 *
 * 【定位】
 * 回答一个具体问题：「我和他（她、它），到底合不合？」
 * 输入两个 64 型编码，输出：关系象限、六维对撞、最默契与最易误读的维度、
 * 以及把「刺耳原话」翻译成「对方真正在怕什么」的双向潜台词词典。
 *
 * 【口径】
 * - 全部计算在浏览器端完成，静态导出即可用，不上传任何数据；
 * - 一方若带真实答题 dims（用户自己），对撞条用真实读数；
 *   另一方只有编码时，用理想化极值（该维 100% 站在自己那一侧）；
 * - 「契合度」是娱乐向的相处顺畅度，不是关系预测。
 */

/** 一方参与者：可以是纯编码，也可以带真实答题读数 */
export interface ChemSide {
  code: string;
  /** 用户自己的六维读数（可选） */
  dims?: Record<DimKey, DimScore>;
}

export type ChemQuadrant = "mirror" | "resonance" | "collision" | "shadow";

export const QUADRANT_META: Record<
  ChemQuadrant,
  { label: string; short: string; color: string; note: string }
> = {
  mirror: {
    label: "同频镜像",
    short: "同频",
    color: "#4CAF6B",
    note: "你们在六个维度上几乎站在同一边。想清楚很快，但也可能同时掉进同一个盲区 —— 少一个人提醒，就少一道刹车。",
  },
  resonance: {
    label: "底色相通 · 调性互补",
    short: "互补",
    color: "#4A90E2",
    note: "底层的认知偏好一致，但推进方式或变化策略不同。这是最好合作的一档：一个负责想清楚，一个负责推出去。",
  },
  collision: {
    label: "思维碰撞 · 执行错位",
    short: "碰撞",
    color: "#C97A2B",
    note: "看世界的方式不同，但做事的方式接近。容易吵在「结论」上，却不难在「行动」上达成一致。",
  },
  shadow: {
    label: "全维镜像 · 阴影导师",
    short: "镜像",
    color: "#7B61FF",
    note: "六个维度几乎全部相反。你缺的那一维，正是对方最自然的部分 —— 相处需要磨合，彼此照见的能力也最强。",
  },
};

/** 逐维对撞条目 */
export interface ChemDimRow {
  key: DimKey;
  /** 维度名 */
  name: string;
  /** 两人各自偏向自己那一侧的强度 0–100 */
  aStrength: number;
  bStrength: number;
  /** 是否同侧 */
  sameSide: boolean;
  /** 摩擦权重（越高越容易互相误读） */
  friction: number;
  /** 一句话说明 */
  note: string;
}

/** 一组潜台词翻译 */
export interface ChemScript {
  /** 场景名 */
  scene: string;
  /** A 说的原话 */
  aSays: string;
  /** A 这句话背后真正在怕什么 */
  aMeans: string;
  /** B 说的原话 */
  bSays: string;
  /** B 这句话背后真正在怕什么 */
  bMeans: string;
  /** A 可以这样接 */
  aReply: string;
  /** B 可以这样接 */
  bReply: string;
}

export interface ChemistryReport {
  a: Type64;
  b: Type64;
  quadrant: ChemQuadrant;
  /** 象限标签（与 QUADRANT_META.label 一致，便于直接展示） */
  quadrantLabel: string;
  quadrantNote: string;
  /** 契合度 0–100 */
  score: number;
  /** 张力指数 0–100（越高越容易吵，也越有势能） */
  tension: number;
  /** 六维 L1 距离 */
  distance: number;
  dims: ChemDimRow[];
  /** 最默契的两个维度 */
  allies: DimKey[];
  /** 最容易互相误读的两个维度 */
  frictions: DimKey[];
  /** 双向潜台词翻译（两组） */
  scripts: ChemScript[];
  /** 一句合盘金句 */
  headline: string;
}

/* ------------------------------------------------------------ 契合度权重 */

/** [同侧加分, 异侧扣分] —— 协作口径，与恋爱兼容度的权重取向不同 */
const COLLAB_WEIGHTS: Record<DimKey, readonly [number, number]> = {
  EI: [5, 4],
  SN: [6, 3],
  TF: [5, 5],
  JP: [7, 6],
  AC: [7, 4],
  OH: [6, 4],
};
const COLLAB_BASE = 62;

/** 摩擦排序权重：错位时谁最难受 */
const FRICTION_ORDER: DimKey[] = ["JP", "TF", "AC", "EI", "OH", "SN"];

/* -------------------------------------------------------- 潜台词词典 */

/** AC 轴（A 坚定推进 / C 审慎校准）的四种组合 */
const AC_SCENES: Record<string, ChemScript> = {
  "A-A": {
    scene: "谁来拍板",
    aSays: "这个我来定，你们按我说的做。",
    aMeans: "他不是要当老大，是怕再拖下去就没人敢拍板了 —— 他在替这段关系担风险。",
    bSays: "行，你定，但我要把风险都列出来。",
    bMeans: "他愿意交出决定权，但要先有清单兜底 —— 他要的是可追溯，不是控制权。",
    aReply: "「拍板我来，风险清单你来 —— 我们分工，不是谁说了算。」",
    bReply: "「你先说结论，我补三条最坏情况，我们一起定。」",
  },
  "A-C": {
    scene: "方案评审",
    aSays: "这版就按这个走，明天上线。",
    aMeans: "他怕再拖一天，节奏比周全更重要 —— 晚一天启动，机会就没了。",
    bSays: "再等等，这个模块的异常分支我们还没测。",
    bMeans: "他怕上线后收不了场 —— 对他来说，上线是签字，出了事签字的人负责。",
    aReply: "「那我加个灰度开关，你先看异常分支 —— 风险我担，你帮我卡住它。」",
    bReply: "「给我两天，我把三种回滚路径都写出来，你照着挑一条。」",
  },
  "C-A": {
    scene: "临时变更",
    aSays: "方向没问题，但能不能先按原计划走完这一步？",
    aMeans: "他不是犹豫，是不想在没验证的地面上盖第二层 —— 他在替你们留后路。",
    bSays: "机会只有这周，等不了了。",
    bMeans: "他不是急躁，是清楚窗口一旦关上就再也开不了 —— 他在替你们抓时间。",
    aReply: "「给我一个能同时走的最小版本，你那边按原计划继续推。」",
    bReply: "「那我把不可逆的那一步拆出来，只做这一段。」",
  },
  "C-C": {
    scene: "出了问题",
    aSays: "先别急，我们再核对一遍是不是哪里漏了。",
    aMeans: "他不是在推责任，是不想在没查清前给你一个错误结论 —— 他在保护你。",
    bSays: "我也不是怀疑你，只是想确认一下。",
    bMeans: "他不是要挑毛病，是需要确认自己的理解没有偏差 —— 他在保护这段关系。",
    aReply: "「我把我确认过的部分先给你，剩下的我们一起对。」",
    bReply: "「我们把标准先说清楚，再各自回去核。」",
  },
};

/** OH 轴（O 求新探索 / H 守成沉淀）的四种组合 */
const OH_SCENES: Record<string, ChemScript> = {
  "O-O": {
    scene: "要不要再开一个坑",
    aSays: "既然这个跑通了，那要不要再开一个？",
    aMeans: "他不是在折腾，是怕停在原地就错过下一个窗口 —— 他在替未来抢时间。",
    bSays: "开可以，但我们先把上一个收干净。",
    bMeans: "他不是保守，是不想让摊子越铺越大收不回来 —— 他在替你们留余地。",
    aReply: "「新坑我开，老坑我陪你在两周内收尾。」",
    bReply: "「给我一个收尾的时间点，到点我们一起开新的。」",
  },
  "O-H": {
    scene: "要不要换方法",
    aSays: "现在这套太慢了，我们换个玩法试试。",
    aMeans: "他不是嫌慢，是看得见旧路线的天花板 —— 他在替这件事找一条新路。",
    bSays: "先把现在这套跑顺了再说。",
    bMeans: "他不是守旧，是清楚半路换招的成本有多高 —— 他在替这件事保住基本盘。",
    aReply: "「你保基本盘，我开小样 —— 一周后看数据再决定要不要换。」",
    bReply: "「我给你两周，你先跑小样，我这边不动。」",
  },
  "H-O": {
    scene: "想推新东西",
    aSays: "我想试试新的，现在就动。",
    aMeans: "他不是沉不住气，是憋久了怕错过 —— 他在替自己抢一次机会。",
    bSays: "先别动，我们按原来的节奏来。",
    bMeans: "他不是胆小，是清楚现在这盘经不起折腾 —— 他在替你们守住能交差的东西。",
    aReply: "「我先在小范围试，不动主线 —— 一周后给你看结果。」",
    bReply: "「你试的时候把红线画出来，我们各守一段。」",
  },
  "H-H": {
    scene: "要不要变一变",
    aSays: "这样挺好的，别折腾了。",
    aMeans: "他不是懒，是这套已经能兑现承诺 —— 他在替你们守住确定性。",
    bSays: "我知道，但我总觉得还能更好。",
    bMeans: "他不是要推翻，是不甘心停在已经够好的地方 —— 他在替这件事争上限。",
    aReply: "「你守住的部分我不碰，我只想在你划的线外试一次。」",
    bReply: "「我改一个环节，其余照旧 —— 改完我们一起看结果。」",
  },
};

/** 合盘金句模板 */
function headlineOf(quadrant: ChemQuadrant, allies: DimKey[], frictions: DimKey[]): string {
  const ally = allies.length ? DIMS[allies[0]].name : "关键维度";
  const fric = frictions.length ? DIMS[frictions[0]].name : "关键维度";
  switch (quadrant) {
    case "mirror":
      return `你们在${ally}上几乎是同一个人 —— 也意味着${fric}上谁也没人提醒。`;
    case "resonance":
      return `底子在同一层，${fric}是你们最容易错位的地方，也是最容易互相补的地方。`;
    case "collision":
      return `吵在${fric}，成事在${ally} —— 你们的争论其实一直在帮你收敛。`;
    case "shadow":
      return `你是他缺的那一半，也是他最不敢要的那一半。`;
  }
}

/* --------------------------------------------------------------- 主函数 */

/** 把一侧归一化成「每一维站在哪一边、强度多少」 */
function sideVector(side: ChemSide): { poles: string[]; strengths: number[]; values: number[] } {
  if (side.dims) {
    const poles = DIM_ORDER.map((k) => side.dims![k].pole);
    const strengths = DIM_ORDER.map((k) => side.dims![k].preferred);
    const values = vectorFromDims(side.dims);
    return { poles, strengths, values };
  }
  const v = vectorFromCode(side.code);
  const poles = DIM_ORDER.map((_, i) => (v[i] > 0 ? DIMS[DIM_ORDER[i]].poleA : DIMS[DIM_ORDER[i]].poleB));
  const strengths = DIM_ORDER.map(() => 100);
  return { poles, strengths, values: v };
}

export function chemistryReport(a: ChemSide, b: ChemSide): ChemistryReport {
  const typeA = getType(a.code);
  const typeB = getType(b.code);
  const va = vectorFromCode(a.code);
  const vb = vectorFromCode(b.code);
  const distance = l1Distance(va, vb);

  const sa = sideVector(a);
  const sb = sideVector(b);

  /* 逐维对撞 */
  const rows: ChemDimRow[] = DIM_ORDER.map((key, i) => {
    const sameSide = va[i] === vb[i];
    const friction = sameSide ? 0 : COLLAB_WEIGHTS[key][1];
    return {
      key,
      name: DIMS[key].name,
      aStrength: Math.round(sa.strengths[i]),
      bStrength: Math.round(sb.strengths[i]),
      sameSide,
      friction,
      note: sameSide
        ? `同侧：都偏${DIMS[key].poleA === sa.poles[i] ? DIMS[key].poleAName : DIMS[key].poleBName}`
        : `对撞：${sa.poles[i]} 与 ${sb.poles[i]} 正面相撞`,
    };
  });

  /* 象限：前四维（认知偏好）与后两维（调性）是否同侧 */
  const frontSame = [0, 1, 2, 3].every((i) => va[i] === vb[i]);
  const suffixSame = [4, 5].every((i) => va[i] === vb[i]);
  const quadrant: ChemQuadrant = frontSame && suffixSame
    ? "mirror"
    : frontSame
      ? "resonance"
      : suffixSame
        ? "collision"
        : "shadow";

  /* 契合度与张力 */
  let score = COLLAB_BASE;
  let tension = 0;
  for (const k of DIM_ORDER) {
    const i = DIM_ORDER.indexOf(k);
    const same = va[i] === vb[i];
    const [plus, minus] = COLLAB_WEIGHTS[k];
    score += same ? plus : -minus;
    if (!same) tension += minus;
  }
  score = Math.max(8, Math.min(96, Math.round(score)));
  tension = Math.max(0, Math.min(100, Math.round((tension / 26) * 100)));

  /* 最默契 / 最易误读 */
  const allies = rows
    .filter((r) => r.sameSide)
    .sort((x, y) => COLLAB_WEIGHTS[y.key][0] - COLLAB_WEIGHTS[x.key][0])
    .slice(0, 2)
    .map((r) => r.key);

  const frictions = rows
    .filter((r) => !r.sameSide)
    .sort((x, y) => {
      const ox = FRICTION_ORDER.indexOf(x.key);
      const oy = FRICTION_ORDER.indexOf(y.key);
      return ox - oy;
    })
    .slice(0, 2)
    .map((r) => r.key);

  /* 潜台词：AC 轴一组 + OH 轴一组 */
  const acPair = `${typeA.ac}-${typeB.ac}`;
  const ohPair = `${typeA.oh}-${typeB.oh}`;
  const scripts = [AC_SCENES[acPair], OH_SCENES[ohPair]].filter(Boolean);

  return {
    a: typeA,
    b: typeB,
    quadrant,
    quadrantLabel: QUADRANT_META[quadrant].label,
    quadrantNote: QUADRANT_META[quadrant].note,
    score,
    tension,
    distance,
    dims: rows,
    allies,
    frictions,
    scripts,
    headline: headlineOf(quadrant, allies, frictions),
  };
}

/** 供 UI 直接用的象限配色 */
export function quadrantColor(quadrant: ChemQuadrant): string {
  return QUADRANT_META[quadrant].color;
}
