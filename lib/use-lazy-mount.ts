"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 元素接近视口时才挂载重型内容。
 *
 * 【为什么需要】
 * 结果页首屏的 LCP 是主卡里的角色插画。如果书稿深度区块在挂载时就
 * 立刻加载（动态 chunk + 20KB JSON），这些请求会和 LCP 图片抢带宽与主线程，
 * 实测让结果页 LCP 慢了约 250ms。
 *
 * 而这块内容本来就在首屏之下（用户要滚过去才看得到），
 * 所以推迟到「接近视口」再加载，对用户零感知，却把首屏还给了 LCP。
 *
 * rootMargin 留出提前量：进入视口前 800px 就开始加载，滚到时已经就绪。
 *
 * 【为什么用 callback ref 而不是 useRef】
 * 结果页在数据水合前会先渲染骨架，被观察的节点那时还不存在。
 * 若用 useRef + 依赖为空的 effect，挂载那一刻 ref.current 是 null，
 * 观察器就永远装不上，内容再也不会加载。
 * 用 state 承载的 callback ref，节点出现时会重新触发 effect。
 */
export function useNearViewport<T extends HTMLElement>(rootMargin = "800px") {
  const [node, setNode] = useState<T | null>(null);
  const [near, setNear] = useState(false);

  const ref = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;
    // 不支持 IntersectionObserver 的老浏览器：直接挂载，别让内容永远不出现
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, rootMargin]);

  return { ref, near };
}
