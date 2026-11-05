import type { Config } from "tailwindcss";

/**
 * MBTI64 Design Tokens
 *
 * 品牌基准：
 * - 深海军蓝 #0F2747 = 品牌专业性与核心交互色
 * - 四大人格族群色 = 仅用于分类识别（分析师紫 / 外交家绿 / 守护者蓝 / 冒险家黄）
 * - 页面保持浅色底（#F8FAFC），不做大面积深色主题
 *
 * 兼容策略：沿用 paper/wash/line/ink 这组旧 token 名并重估值，
 * 避免数百处 class 使用点被批量重命名；新增 navy/brand/surface 体系。
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./data/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ---- 品牌基础色 ---- */
        navy: { DEFAULT: "#0F2747", deep: "#0A1B33", soft: "#E8EEF5" },
        brand: { background: "#F8FAFC", surface: "#FFFFFF", border: "#E8E8E8" },
        surface: { page: "#F8FAFC", card: "#FFFFFF", hover: "#F1F5F9" },

        /* ---- 中性文字 / 边框（旧 token 名重估） ---- */
        paper: "#FFFFFF",
        wash: "#F8FAFC",
        line: "#E8E8E8",
        ink: {
          DEFAULT: "#172B45",
          soft: "#5A6A7E",
          mute: "#5B6B80",
        },
        text: { primary: "#172B45", secondary: "#5A6A7E", muted: "#5B6B80" },
        border: { DEFAULT: "#E8E8E8", strong: "#CBD5E1" },

        /* ---- 四大人格族群色（唯一分类语义色） ----
           color 仅用于 Logo / 图形 / 色点 / 图表填充；
           text 为白底可读的加深版（对比度 ≥ 4.5:1）；
           soft 用于族群标签底；light 用于大区块淡底。 */
        analyst: { DEFAULT: "#7B61FF", text: "#5A3FD1", soft: "#E5DEFF", light: "#F1EDFF" },
        diplomat: { DEFAULT: "#4CAF6B", text: "#1E6B34", soft: "#D5EFDE", light: "#EAF7EE" },
        guardian: { DEFAULT: "#4A90E2", text: "#1A659F", soft: "#D6E8FB", light: "#EAF3FD" },
        adventurer: { DEFAULT: "#F6C343", text: "#7A5600", soft: "#FBE9B3", light: "#FFF7DF" },

        /* ---- 交互状态色（不得与族群色混用） ---- */
        success: "#24803F",
        warning: "#8A6200",
        error: "#B42318",
        info: "#1E6FB8",
        disabled: "#94A3B8",
      },
      fontFamily: {
        /* 正文：思源黑体（Source Han Sans SC）；未安装时回落到常见系统中文字体 */
        sans: [
          "Inter",
          '"Source Han Sans SC"',
          '"思源黑体 CN"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        /* 引语：霞鹜文楷（自托管子集），回落到中文楷体/宋体 */
        quote: ['"LXGW WenKai"', '"霞鹜文楷"', '"Kaiti SC"', "KaiTi", '"Songti SC"', '"Noto Serif SC"', "Georgia", "serif"],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 39, 71, 0.06)",
        lift: "0 12px 28px -14px rgba(15, 39, 71, 0.18)",
      },
      transitionTimingFunction: {
        product: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        fadein: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        radardraw: {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-in": "fadein 220ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "radar-draw": "radardraw 800ms cubic-bezier(0.22, 0.61, 0.36, 1) 120ms both",
      },
    },
  },
  plugins: [],
};

export default config;
