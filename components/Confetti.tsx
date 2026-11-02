"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * 彩带撒花（DOM 粒子，无 canvas）
 *
 * 只在「结果生成」和「解锁成功」两处触发，duration 内自动卸载，
 * 不会持续占用主线程，也不会影响滚动性能。
 */

const COLORS = ["#7C5CFF", "#FF8A8A", "#7FD1AE", "#5FA8E8", "#FFD166", "#B7A6FF"];

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  shape: "rect" | "circle" | "ribbon";
  rotate: number;
  drift: number;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }).map((_, i) => {
    // 用确定性伪随机（避免 SSR/CSR 不一致；组件本身 client-only，但仍保持可复现）
    const r = (n: number) => {
      const v = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    return {
      id: i,
      x: r(1) * 100,
      delay: r(2) * 0.5,
      duration: 1.5 + r(3) * 1.2,
      size: 6 + r(4) * 8,
      color: COLORS[Math.floor(r(5) * COLORS.length) % COLORS.length],
      shape: (["rect", "circle", "ribbon"] as const)[Math.floor(r(6) * 3) % 3],
      rotate: r(7) * 360,
      drift: (r(8) - 0.5) * 160,
    };
  });
}

export default function Confetti({
  count = 48,
  duration = 2600,
  className,
}: {
  count?: number;
  /** 毫秒；到时自动隐藏 */
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);
  const particles = useMemo(() => makeParticles(count), [count]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: "-12vh", opacity: 0, rotate: 0 }}
          animate={{ y: "104vh", opacity: [0, 1, 1, 0], rotate: p.rotate + 540, x: p.drift }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: 0,
            width: p.shape === "ribbon" ? p.size / 2.4 : p.size,
            height: p.shape === "circle" ? p.size : p.size * (p.shape === "ribbon" ? 2.6 : 1),
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "ribbon" ? "2px" : "2px",
            background: p.color,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}
