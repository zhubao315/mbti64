#!/usr/bin/env node
/**
 * 双人合盘主视觉 · 生成（Qwen-Image-2.1）
 *
 * 用法：
 *   node scripts/generate-chem-art.mjs              # 生成全部 5 张
 *   node scripts/generate-chem-art.mjs hero         # 只生成某一张
 *
 * 提示词与画面规划在 scripts/chem-art-plan.mjs（改画面先改那里）。
 * 生成完再跑 node scripts/chem-assets.mjs 转成 webp 并写清单。
 *
 * 【注意】
 * - 不固定 seed：固定 seed + 相同参数会命中 ComfyUI 执行缓存，几毫秒返回旧图；
 * - 图像服务不在本机时用 --base 切入口（脚本已默认走外网入口并自动回退）。
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAN, NEG_COMMON } from "./chem-art-plan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER = process.env.QWEN_RUNNER || "/home/hermes/comfyui-qwen-image-2.1/run_workflow.py";

const only = process.argv[2];
const targets = only ? PLAN.filter((p) => p.key === only) : PLAN;
if (targets.length === 0) {
  console.error(`没有 key=${only} 的生成计划项。可用：${PLAN.map((p) => p.key).join(", ")}`);
  process.exit(1);
}

for (const item of targets) {
  console.log(`\n=== 生成 ${item.key}（${item.label}）${item.width}×${item.height} ===`);
  const res = spawnSync(
    "python3",
    [
      RUNNER,
      "t2i",
      "--prompt",
      item.prompt,
      "--negative",
      NEG_COMMON,
      "--width",
      String(item.width),
      "--height",
      String(item.height),
      "--prefix",
      item.file,
      "--json",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  const out = (res.stdout || "").trim().split("\n").pop() || "";
  console.log(out);
  try {
    const parsed = JSON.parse(out);
    if (!parsed.ok) {
      console.error(`生成失败: ${item.key}`);
      process.exit(1);
    }
  } catch {
    console.error(`无法解析输出: ${out}`);
    process.exit(1);
  }
}

console.log("\n✓ 全部生成完成。接着运行：node scripts/chem-assets.mjs");
