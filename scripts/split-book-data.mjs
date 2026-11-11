#!/usr/bin/env node
/**
 * 拆分书稿深度数据 → public/data/book/<BASE>.json
 *
 * 【为什么需要拆】
 * 结果页要按「用户是哪个基础型」渲染书稿深度内容，但结果本身来自
 * localStorage，只有 JS 水合后才知道基础型 —— 服务端没法按型别裁剪后内联。
 * 若把 data/bookEnriched.json（475KB）整个打进客户端包，结果页首屏必然崩。
 *
 * 拆成 16 个「按基础型」的小文件后：
 *   - 结果页运行时只取自己那一个（约 8KB），首屏包体与 LCP 零影响；
 *   - 每个文件去掉未被任何组件使用的整章 body（spiralStage.*.body），
 *     只保留罗盘需要的字段。
 *
 * 【单一事实源】
 * 内容仍以 data/bookEnriched.json 为准（由 scripts/extract-book-data.mjs 生成），
 * 本脚本只做切分，不新增、不改写任何文案。
 * 产物目录 public/data/book/ 已 gitignore，每次构建前重新生成。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "data", "bookEnriched.json");
const OUT_DIR = path.join(ROOT, "public", "data", "book");

/** spiralStage 里没有任何组件用到的字段，切分时剔除 */
const DROP_FROM_VARIANT = ["body"];

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`ERROR: ${SOURCE} 不存在，请先运行 node scripts/extract-book-data.mjs`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const types = raw.types ?? {};
  const bases = Object.keys(types);
  if (bases.length === 0) {
    console.error("ERROR: data/bookEnriched.json 里没有 types");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 清理上一轮遗留（基础型被删时不会留下孤儿文件）
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith(".json")) fs.rmSync(path.join(OUT_DIR, f));
  }

  let total = 0;
  for (const base of bases) {
    const t = types[base];
    const spiralStage = {};
    for (const [suffix, variant] of Object.entries(t.spiralStage ?? {})) {
      const lite = { ...variant };
      for (const k of DROP_FROM_VARIANT) delete lite[k];
      spiralStage[suffix] = lite;
    }

    const payload = {
      base: t.base,
      cn: t.cn,
      bookChapter: t.bookChapter,
      bookChapterPath: t.bookChapterPath,
      neuroBase: t.neuroBase,
      spiralStage,
      chinaSlices: t.chinaSlices,
      intimacyContract: t.intimacyContract,
      mirrorMentor: t.mirrorMentor,
      deliberatePractice: t.deliberatePractice,
    };

    const out = path.join(OUT_DIR, `${base}.json`);
    fs.writeFileSync(out, JSON.stringify(payload), "utf8");
    total += fs.statSync(out).size;
  }

  // 清单：让客户端知道有哪些基础型可用（不做遍历猜测）
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({
      generatedAt: raw.generatedAt,
      bookVersion: raw.bookVersion,
      totalChapters: raw.totalChapters,
      bases,
    }),
    "utf8",
  );

  console.log(
    `✓ 书稿深度数据已拆分：${bases.length} 个基础型，共 ${(total / 1024).toFixed(0)} KB → public/data/book/`,
  );
}

main();
