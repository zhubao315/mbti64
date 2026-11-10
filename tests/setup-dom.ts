/**
 * jsdom 环境的通用补丁（仅组件级测试需要）。
 * Node 侧测试（.test.ts）不会加载本文件。
 */

// jsdom 未实现 matchMedia，组件里判断 prefers-reduced-motion 时会报错
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom 未实现 scrollTo / scrollIntoView
if (typeof window !== "undefined") {
  if (!window.scrollTo) window.scrollTo = (() => {}) as typeof window.scrollTo;
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
}
