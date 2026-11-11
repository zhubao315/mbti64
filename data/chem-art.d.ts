/**
 * 双人合盘 AI 主视觉清单
 *
 * 图由 Qwen-Image-2.1 生成，风格沿用站点的「日光棱镜 Solar-Poly 64」视觉语言
 * （纯白背景 / 低多边形几何折纸人物 / 彩色半透明磨砂亚克力 / 不生成任何文字）。
 * 提示词与生成计划见 scripts/chem-art-plan.mjs，资产处理见 scripts/chem-assets.mjs。
 */
export interface ChemArtItem {
  /** 站内路径（public/assets/chem/ 下的 webp） */
  file: string;
  /** 中文标签 */
  label: string;
  width: number;
  height: number;
}

declare const chemArt: {
  generatedAt: string;
  model: string;
  style: string;
  art: {
    hero: ChemArtItem;
    mirror: ChemArtItem;
    resonance: ChemArtItem;
    collision: ChemArtItem;
    shadow: ChemArtItem;
  };
};

export default chemArt;
