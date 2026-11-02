import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./data/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: "#7C5CFF",
          deep: "#5B3FCC",
          soft: "#B7A6FF",
        },
        avocado: { DEFAULT: "#7FD1AE", deep: "#3F9C7A" },
        coral: { DEFAULT: "#FF8A8A", deep: "#E05C5C" },
        ink: { DEFAULT: "#2B2540", soft: "#5B5470", mute: "#8B85A0" },
        cream: "#FFF8F2",
        sand: "#F6EFE6",
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "HarmonyOS Sans SC",
          "Noto Sans SC",
          "Source Han Sans SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 18px 45px -22px rgba(59, 40, 120, 0.35)",
        glow: "0 0 0 1px rgba(124, 92, 255, 0.35), 0 0 32px rgba(124, 92, 255, 0.45)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", filter: "drop-shadow(0 12px 28px rgba(124,92,255,0.28))" },
          "50%": { transform: "scale(1.025)", filter: "drop-shadow(0 18px 40px rgba(255,138,138,0.32))" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        breathe: "breathe 5.5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
