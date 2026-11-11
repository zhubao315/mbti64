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

/** 书稿第 24 章的完整计划长度（30 天） */
export const PRACTICE_PLAN_DAYS = 30;

/** 计划里的一天（来自 data/practiceLab.json） */
export interface PracticePlanDay {
  day: number;
  /** 当天的具体微动作 */
  action: string;
  /** 对应练习方向 */
  direction: string;
  /** 晚间回顾提问 */
  question: string;
}

/** 当前处在 30 天计划的第几天（1~30）；未开始返回 0 */
export function planDayOf(state: PracticeState, now = new Date()): number {
  const idx = dayIndexOf(state.startDate, now);
  if (idx < 0) return 0;
  return Math.min(PRACTICE_PLAN_DAYS, idx + 1);
}

/** 30 天完成情况 */
export function planProgress(
  state: PracticeState,
  now = new Date(),
): { done: number; total: number; percent: number; currentDay: number } {
  const idx = dayIndexOf(state.startDate, now);
  const elapsed = idx < 0 ? 0 : Math.min(PRACTICE_PLAN_DAYS, idx + 1);
  const done = state.checkins.length;
  return {
    done,
    total: PRACTICE_PLAN_DAYS,
    percent: Math.round((done / PRACTICE_PLAN_DAYS) * 100),
    currentDay: elapsed,
  };
}

/** 计划第 N 天对应的日期（ISO）；没有开始日期时返回 null */
export function dateOfPlanDay(startDate: string | null, day: number): string | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + day - 1);
  return todayISO(start);
}

/**
 * 导出 Markdown 复盘手记。
 *
 * 这是「30 天练习」真正的交付物：一张可以贴进笔记软件的表，
 * 包含每天做了什么、当时的晚间回顾，以及书稿对应的原始问题。
 */
/** 四个方向的完整名称（导出时用，别把 c2a 这种内部键写进手记） */
export const DIRECTION_LABELS: Record<PracticeDirection, string> = {
  c2a: "C → A（从审慎校准到清晰主张）",
  a2c: "A → C（从果断主张回到审慎校准）",
  o2h: "O → H（从求新探索到守成沉淀）",
  h2o: "H → O（从守成维护到重新求新）",
};

export function exportPracticeMarkdown(
  state: PracticeState,
  plan: PracticePlanDay[] = [],
): string {
  const byDay = new Map(plan.map((d) => [d.day, d]));
  const lines: string[] = [];

  lines.push("# 我的 30 天人格探索复盘");
  lines.push("");
  lines.push(`- 练习方向：${state.direction ? DIRECTION_LABELS[state.direction] : "（未选择）"}`);
  lines.push(`- 开始日期：${state.startDate ?? "（未开始）"}`);
  lines.push(`- 打卡天数：${state.checkins.length} / ${PRACTICE_PLAN_DAYS}`);
  lines.push("");
  lines.push("## 逐日记录");
  lines.push("");

  // 走完 30 天：没打卡的也列出来（空白本身就是复盘的一部分）
  const dayCount = Math.max(plan.length, PRACTICE_PLAN_DAYS);
  for (let day = 1; day <= dayCount; day += 1) {
    const p = byDay.get(day);
    const date = dateOfPlanDay(state.startDate, day);
    const done = date ? state.checkins.includes(date) : false;
    const review = date ? state.reviews[date] : undefined;

    lines.push(`### 第 ${day} 天${date ? ` · ${date}` : ""}`);
    if (p) {
      lines.push(`- 微动作：${p.action}`);
      lines.push(`- 练习方向：${p.direction}`);
      lines.push(`- 书稿的晚间回顾提问：${p.question}`);
    }
    if (date) lines.push(`- 打卡：${done ? "已完成" : "未完成"}`);
    if (review) lines.push(`- 我的回顾：${review}`);
    lines.push("");
  }

  if (state.checkins.length === 0) {
    lines.push("（还没有打卡记录。先选一个方向，开始第一天。）");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("数据来自《千分之一的你》第六卷第 24 章 · 30 天人格探索与行为练习计划。");
  lines.push("本文件由 MBTI64 站点在你的浏览器本地生成，不含任何答题原始数据。");

  return lines.join("\n");
}

/** 触发浏览器下载一段文本 */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
