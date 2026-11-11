import type { DimScore } from "@/data/schema";
import type { PracticeDirection } from "@/lib/practice-store";

/**
 * 微动作练习推荐
 *
 * 【推荐口径】
 * 取用户偏离中位（50%）最远的那一轴 —— 越极端的倾向，越需要练它的反面旋钮。
 *   AC 轴偏 A（坚定推进）→ a2c：学会在拍板前多核对一步
 *   AC 轴偏 C（审慎校准）→ c2a：学会把判断说出口、推出去
 *   OH 轴偏 O（求新探索）→ o2h：学会把新东西沉淀成基本盘
 *   OH 轴偏 H（守成沉淀）→ h2o：学会在守成之外重新开一个新坑
 *
 * 摇摆轴（swing）不参与比较：那一轴本来就没有清晰读数，
 * 先把另一轴调稳更有意义。两轴都在摇摆时不给推荐。
 */
export interface PracticeRecommendation {
  direction: PracticeDirection;
  /** 一句人话解释为什么先练这一格 */
  reason: string;
}

type SuffixDims = { AC: DimScore; OH: DimScore };

export function recommendPractice(dims: SuffixDims): PracticeRecommendation | null {
  const ac = dims.AC;
  const oh = dims.OH;

  const acDev = Math.abs(ac.percentA - 50);
  const ohDev = Math.abs(oh.percentA - 50);

  // 摇摆轴没有清晰读数，不参与「谁偏得更远」的比较
  const candidates: Array<{ dev: number; rec: PracticeRecommendation }> = [];
  if (!ac.swing && acDev > 0) {
    candidates.push({
      dev: acDev,
      rec:
        ac.percentA > 50
          ? { direction: "a2c", reason: "你的决策姿态偏坚定推进，先练一格「回到审慎校准」" }
          : { direction: "c2a", reason: "你的决策姿态偏审慎校准，先练一格「把判断说出口」" },
    });
  }
  if (!oh.swing && ohDev > 0) {
    candidates.push({
      dev: ohDev,
      rec:
        oh.percentA > 50
          ? { direction: "o2h", reason: "你的变化策略偏求新探索，先练一格「把新东西沉淀成基本盘」" }
          : { direction: "h2o", reason: "你的变化策略偏守成沉淀，先练一格「在守成之外重新开坑」" },
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.dev - a.dev);
  return candidates[0].rec;
}
