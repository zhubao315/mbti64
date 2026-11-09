#!/usr/bin/env node
/**
 * 《千分之一的你》参考图生成器（阶段二）
 *
 * 提示词唯一事实源：docs/book-visual/02-参考图提示词包.md
 * 解析形如  ```prompt <ID> | <尺寸> | <文件名>  的代码块，顺序调用图片网关，落盘到 docs/book-visual/refs/。
 *
 * 用法：
 *   node tools/gen_solarpoly_refs.mjs                 # 只生成缺失的
 *   node tools/gen_solarpoly_refs.mjs --force         # 全部重生成
 *   node tools/gen_solarpoly_refs.mjs --only 01_cover_front_v01,10_type-INFJ_base_v01
 *   node tools/gen_solarpoly_refs.mjs --dry           # 只解析，不生成
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const specArg = argv.find((a) => a.startsWith("--spec"));
const SPEC = specArg
  ? path.resolve(ROOT, specArg.includes("=") ? specArg.split("=")[1] : argv[argv.indexOf(specArg) + 1] ?? "")
  : path.join(ROOT, "docs", "book-visual", "02-参考图提示词包.md");
const OUT = path.join(ROOT, "docs", "book-visual", "refs");
const API = process.env.SOLARPOLY_API ?? "http://192.168.1.3:808/v1/images/generations";
const MODEL = process.env.SOLARPOLY_MODEL ?? "qwen-image-2.1";
const TIMEOUT_MS = Number(process.env.SOLARPOLY_TIMEOUT_MS ?? 180000);

const force = argv.includes("--force");
const dry = argv.includes("--dry");
const onlyArg = argv.find((a) => a.startsWith("--only"));
const only = new Set(
  onlyArg ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : argv[argv.indexOf(onlyArg) + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : [],
);

function parseSpec(md) {
  const re = /```prompt\s+([^|\n]+?)\s*\|\s*(\d+x\d+)\s*\|\s*([^\n]+?)\s*\n([\s\S]*?)```/g;
  const items = [];
  for (const m of md.matchAll(re)) {
    items.push({ id: m[1].trim(), size: m[2].trim(), file: m[3].trim(), prompt: m[4].trim() });
  }
  return items;
}

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function generate(item) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ model: MODEL, prompt: item.prompt, n: 1, size: item.size }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error(`返回无 b64_json: ${JSON.stringify(json).slice(0, 200)}`);
    const buf = Buffer.from(b64, "base64");
    const dst = path.join(OUT, item.file);
    await fs.writeFile(dst, buf);
    const dim = pngSize(buf);
    return {
      ok: true,
      file: item.file,
      bytes: buf.length,
      dim,
      sizeMatches: dim ? `${dim.width}x${dim.height}` === item.size : null,
      seconds: Math.round((Date.now() - t0) / 10) / 100,
    };
  } catch (e) {
    return { ok: false, file: item.file, error: String(e?.message ?? e), seconds: Math.round((Date.now() - t0) / 10) / 100 };
  } finally {
    clearTimeout(timer);
  }
}

const md = await fs.readFile(SPEC, "utf8");
const items = parseSpec(md).filter((i) => (only.size ? only.has(i.id) : true));
if (!items.length) {
  console.error("未在提示词包中解析到任何 prompt 块，请检查格式：```prompt <ID> | <尺寸> | <文件名>");
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
console.log(`解析到 ${items.length} 项：${items.map((i) => i.id).join(", ")}`);
if (dry) {
  for (const i of items) console.log(`- ${i.id} | ${i.size} | ${i.file} | prompt ${i.prompt.length} 字`);
  process.exit(0);
}

const report = [];
for (const [idx, item] of items.entries()) {
  const dst = path.join(OUT, item.file);
  if (!force) {
    try {
      const st = await fs.stat(dst);
      const size = pngSize(await fs.readFile(dst));
      console.log(`[skip] ${item.file} 已存在 ${size ? `${size.width}x${size.height}` : ""} ${Math.round(st.size / 1024)}KB`);
      report.push({ id: item.id, skipped: true, file: item.file, dim: size });
      continue;
    } catch {
      /* 不存在，继续生成 */
    }
  }
  process.stdout.write(`[${idx + 1}/${items.length}] ${item.id} ... `);
  const r = await generate(item);
  report.push({ id: item.id, ...r });
  if (r.ok) console.log(`ok ${r.dim ? `${r.dim.width}x${r.dim.height}` : "?"} ${Math.round(r.bytes / 1024)}KB ${r.seconds}s${r.sizeMatches === false ? "  ⚠ 尺寸不符" : ""}`);
  else console.log(`FAIL ${r.error}`);
}

const logPath = path.join(OUT, "_gen_log.json");
const prev = await fs.readFile(logPath, "utf8").then(JSON.parse).catch(() => []);
await fs.writeFile(logPath, JSON.stringify([...prev, { at: new Date().toISOString(), items: report }], null, 2));

const failed = report.filter((r) => r.ok === false);
console.log(`\n完成：成功 ${report.length - failed.length} / ${report.length}${failed.length ? `，失败：${failed.map((f) => f.file).join(", ")}` : ""}`);
process.exit(failed.length ? 2 : 0);
