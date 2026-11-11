export interface PracticeLabDay {
  day: number;
  /** 当天的具体微动作 */
  action: string;
  /** 对应练习方向 */
  direction: string;
  /** 晚间回顾提问 */
  question: string;
}

export interface PracticeLabWeek {
  week: number;
  title: string;
  range: string;
  focus: string;
}

export interface PracticeLabQuadrant {
  name: string;
  coreAction: string;
  behavior: string;
  bestSuffix: string;
  scenes: string;
  risk: string;
}

export interface PracticeLabEntry {
  pair: string;
  surface: string;
  misheard: string;
  mechanism: string;
  reply: string;
}

declare const practiceLab: {
  generatedAt: string;
  bookVersion: string;
  source: { quadrants: string; dictionary: string; days: string };
  quadrants: PracticeLabQuadrant[];
  dictionary: PracticeLabEntry[];
  weeks: PracticeLabWeek[];
  days: PracticeLabDay[];
};

export default practiceLab;
