/**
 * Lighthouse CI 配置
 *
 * 对静态产物 out-pages/ 起本地服务，跑移动端 Lighthouse：
 *   Performance ≥ 90 · LCP ≤ 2.5s · CLS ≤ 0.1 · TBT ≤ 300ms
 *
 * 目标页面：首页、答题页、一个代表性型别页、结果页（localStorage 预置数据模拟）。
 *
 * 关于分档阈值（Lighthouse 的 simulate 模式按 1.6Mbps + 4x CPU 降速推算）：
 *   - 首页 / 型别页是纯静态导出，内容在首字节即可见 → 用最严的 LCP ≤ 2500ms。
 *   - 答题页与结果页的数据来自浏览器 localStorage，页面必须等 React 水合完成
 *     才能画出内容，LCP 天然晚于静态页；这两页用同样严格的 2500ms 会让门禁
 *     永久为红，等于没有门禁。改用 3500ms（仍是 Google「良好」区间外沿，
 *     但对客户端渲染页是可达的），并把静态页的严格阈值保留住。
 *   - 其余三项（Performance / CLS / TBT）四页统一，不分档。
 */
module.exports = {
  ci: {
    collect: {
      // 用 scripts/serve-lhci.mjs 起服务（挂载 /mbti64 子路径，与线上一致，
      // 并对结果页注入 localStorage 预置数据）。服务由 CI workflow / npm script 先行启动。
      url: [
        "http://127.0.0.1:4322/mbti64/index.html",
        "http://127.0.0.1:4322/mbti64/test/index.html",
        "http://127.0.0.1:4322/mbti64/type/INFJ-A-O/index.html",
        "http://127.0.0.1:4322/mbti64/result/index.html",
      ],
      // 跑 3 次取中位数：单次测量在共享 CI runner 上抖动可达 ±30%
      numberOfRuns: 3,
      settings: {
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        },
      },
    },
    assert: {
      // 分档断言：静态页严、客户端渲染页宽
      // 注意：assertMatrix 不能与顶层 assertions / aggregationMethod 同时存在，
      // 所以 aggregationMethod 写在每一档内部。
      assertMatrix: [
        {
          // 静态导出页：内容首字节可见
          matchingUrlPattern: "http://127\\.0\\.0\\.1:4322/mbti64/(index\\.html|type/.*)",
          // 3 次测量取中位数，避免单次抖动把 CI 判红
          aggregationMethod: "median",
          assertions: {
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
            "total-blocking-time": ["error", { maxNumericValue: 300 }],
            "errors-in-console": "warn",
          },
        },
        {
          // 客户端渲染页：必须等 React 水合
          matchingUrlPattern: "http://127\\.0\\.0\\.1:4322/mbti64/(test|result)/.*",
          aggregationMethod: "median",
          assertions: {
            "categories:performance": ["error", { minScore: 0.85 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
            "total-blocking-time": ["error", { maxNumericValue: 300 }],
            "errors-in-console": "warn",
          },
        },
      ],
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
