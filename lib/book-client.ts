/**
 * 客户端书稿深度数据加载器
 *
 * 【为什么在客户端取数据】
 * 结果页要知道「用户是哪个基础型」必须等 JS 水合（结果来自 localStorage），
 * 服务端无法按型别裁剪。把整份 data/bookEnriched.json（475KB）打进客户端包
 * 会直接压垮结果页首屏，所以改成：
 *   构建前由 scripts/split-book-data.mjs 拆成 public/data/book/<BASE>.json，
 *   结果页运行时只取自己那一个（约 8KB）。
 *
 * 单一事实源仍是 data/bookEnriched.json，本模块只是取数入口。
 */
import type {
  BookChinaSlices,
  BookDeliberatePractice,
  BookIntimacyContract,
  BookMirrorMentor,
  BookNeuroBase,
  BookVariant,
} from "@/data/bookEnriched";
import { withBasePath } from "@/lib/site";

/** 去掉未被任何组件使用的整章 body 后的四态条目 */
export type BookVariantLite = Omit<BookVariant, "body">;

export interface BookLite {
  base: string;
  cn: string;
  bookChapter: string;
  bookChapterPath: string;
  neuroBase: BookNeuroBase;
  spiralStage: Record<string, BookVariantLite>;
  chinaSlices: BookChinaSlices;
  intimacyContract: BookIntimacyContract;
  mirrorMentor: BookMirrorMentor;
  deliberatePractice: BookDeliberatePractice;
}

/**
 * 同一基础型的并发请求共享同一个 Promise：
 * 免费区与解锁区两个区块会同时用到同一份数据。
 */
const cache = new Map<string, Promise<BookLite | null>>();

async function fetchBook(base: string): Promise<BookLite | null> {
  if (!/^[A-Z]{4}$/.test(base)) return null;
  try {
    const res = await fetch(withBasePath(`/data/book/${base}.json`), {
      // 静态导出站没有内容哈希，交给浏览器按 URL 缓存
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as BookLite;
    return json && json.base === base ? json : null;
  } catch {
    // 离线或文件缺失：降级为「不展示书稿深度内容」，不影响结果页其余部分
    return null;
  }
}

/** 取某个基础型的书稿深度数据（带缓存） */
export function loadBookLite(base: string): Promise<BookLite | null> {
  const hit = cache.get(base);
  if (hit) return hit;
  const p = fetchBook(base);
  cache.set(base, p);
  return p;
}
