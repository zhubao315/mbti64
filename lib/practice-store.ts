/**
 * 7 天微动作打卡状态（与测评主状态机隔离，使用独立 localStorage 键）
 * 呼应书稿第六卷第 24 章「30 天人格探索与行为练习计划」。
 */

export const PRACTICE_KEY = "p64:practice:v1";

export type PracticeDirection = "c2a" | "a2c" | "o2h" | "h2o";

export interface PracticeState {
  /** 选中的微动作方向 */
  direction: PracticeDirection | null;
  /** 选中的具体微动作文本 */
  action: string | null;
  /** 开始日期（ISO yyyy-mm-dd） */
  startDate: string | null;
  /** 已打卡的日期集合（ISO yyyy-mm-dd） */
  checkins: string[];
  /** 每日晚间回顾一句话 */
  reviews: Record<string, string>;
}

export const EMPTY_PRACTICE: PracticeState = {
  direction: null,
  action: null,
  startDate: null,
  checkins: [],
  reviews: {},
};

export const PRACTICE_DAYS = 7;

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayIndexOf(startDate: string | null, now = new Date()): number {
  if (!startDate) return -1;
  const start = new Date(`${startDate}T00:00:00`);
  const cur = new Date(todayISO(now) + "T00:00:00");
  const diff = Math.round((cur.getTime() - start.getTime()) / 86400000);
  return diff;
}

/** 返回 7 天进度点阵：已过去的天标记完成，今天标记进行中 */
export function progressDots(state: PracticeState, now = new Date()): { date: string; done: boolean; isToday: boolean; future: boolean }[] {
  const idx = dayIndexOf(state.startDate, now);
  const dots: { date: string; done: boolean; isToday: boolean; future: boolean }[] = [];
  for (let i = 0; i < PRACTICE_DAYS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (idx - i));
    const iso = todayISO(d);
    dots.push({
      date: iso,
      done: state.checkins.includes(iso),
      isToday: idx === i,
      future: idx < i,
    });
  }
  return dots;
}

export function readPracticeState(storage?: Storage): PracticeState {
  try {
    const raw = (storage ?? window.localStorage).getItem(PRACTICE_KEY);
    if (!raw) return { ...EMPTY_PRACTICE };
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    return {
      direction: parsed.direction ?? null,
      action: parsed.action ?? null,
      startDate: parsed.startDate ?? null,
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [],
      reviews: parsed.reviews && typeof parsed.reviews === "object" ? parsed.reviews : {},
    };
  } catch {
    return { ...EMPTY_PRACTICE };
  }
}

export function writePracticeState(state: PracticeState, storage?: Storage): void {
  try {
    (storage ?? window.localStorage).setItem(PRACTICE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式下 localStorage 不可用，静默降级 */
  }
}

export function toggleCheckin(state: PracticeState, date: string): PracticeState {
  const has = state.checkins.includes(date);
  return {
    ...state,
    checkins: has ? state.checkins.filter((d) => d !== date) : [...state.checkins, date],
  };
}

export function setReview(state: PracticeState, date: string, text: string): PracticeState {
  return { ...state, reviews: { ...state.reviews, [date]: text } };
}
