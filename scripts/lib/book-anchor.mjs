/**
 * 书稿提取锚点（HTML 注释）
 *
 * 【为什么需要锚点】
 * 提取脚本原本靠正则去正文里找「卡点」「跃迁信号」「生存切片」，
 * 只要作者润色文笔、换个连接词，正则就可能失配 —— 数据管道会悄无声息地
 * 退回到通用兜底文案，而兜底文案本身又是审计脚本的红线。
 *
 * 锚点把「这一句就是数据源」写进原稿：
 *   <!-- @stuck:C-O -->  ……  <!-- /@stuck -->
 *   <!-- @signal:A-H -->  ……  <!-- /@signal -->
 *   <!-- @slice:career --> ……  <!-- /@slice -->
 * HTML 注释对读者不可见，但提取脚本可以精确命中。
 * 正则保留为兜底 —— 万一将来锚点被误删，至少还能退化到关键词匹配。
 *
 * 提取侧优先读锚点，读不到再走正则；两侧口径一致，锚点永远是权威。
 */

/** 锚点种类 */
export const ANCHOR_KINDS = ["stuck", "signal", "slice"];

/**
 * 去掉正文里的锚点标记（只删注释行，不删包裹的内容）。
 *
 * 注意：不能连内容一起删。卡点与跃迁信号写在同一段时，两个锚点是嵌套的 ——
 * 外层卡点锚点的内容里含着内层信号锚点，连内容一起剥会把正文一并删掉。
 */
export function stripAnchors(text) {
  return text
    .replace(/<!--\s*@[\w:-]+\s*-->/g, "")
    .replace(/<!--\s*\/@[\w:-]+\s*-->/g, "");
}

/**
 * 生成匹配某个锚点的正则。
 * @param {string} kind  stuck | signal | slice
 * @param {string} [suffix]  状态后缀（C-O / A-O …）或切片名（career / dinner …）
 */
export function anchorRe(kind, suffix) {
  const name = suffix ? `${kind}:${suffix}` : kind;
  return new RegExp(
    `<!--\\s*@${name.replace(/[-]/g, "\\-")}\\s*-->([\\s\\S]*?)<!--\\s*\\/@${name.replace(/[-]/g, "\\-")}\\s*-->`,
    "i",
  );
}

/**
 * 在正文里找出锚点包裹的内容。
 * 先找带具体名字的锚点（@stuck:C-O），再退化到通用锚点（@stuck）。
 */
export function findAnchored(body, kind, suffix) {
  if (suffix) {
    const m = body.match(anchorRe(kind, suffix));
    // 锚点可能嵌套（卡点与跃迁信号写在同一段时），取出后剥掉内层注释
    if (m) return stripAnchors(m[1]).trim();
  }
  const m = body.match(anchorRe(kind));
  return m ? stripAnchors(m[1]).trim() : "";
}

/** 生成锚点包裹的 Markdown 片段（内容独立成行，读者不可见） */
export function wrapAnchor(kind, suffix, content) {
  const name = suffix ? `${kind}:${suffix}` : kind;
  return `<!-- @${name} -->\n${content}\n<!-- /@${name} -->`;
}
