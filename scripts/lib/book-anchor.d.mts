/** 书稿提取锚点（HTML 注释）—— 类型声明 */

export declare const ANCHOR_KINDS: string[];

/** 去掉正文里的锚点标记（只删注释行，不删包裹的内容） */
export declare function stripAnchors(text: string): string;

/** 生成匹配某个锚点的正则 */
export declare function anchorRe(kind: string, suffix?: string): RegExp;

/** 在正文里找出锚点包裹的内容 */
export declare function findAnchored(body: string, kind: string, suffix?: string): string;

/** 生成锚点包裹的 Markdown 片段 */
export declare function wrapAnchor(kind: string, suffix: string, content: string): string;
