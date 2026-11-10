## Lighthouse 移动端得分

| 页面 | Performance | LCP | CLS | TBT | 变化 |
|---|---:|---:|---:|---:|---:|
| `/mbti64/index.html` | 97 | 2347 ms | 0 | 92 ms | — |
| `/mbti64/result/index.html` | 92 | 2852 ms | 0.079 | 164 ms | — |
| `/mbti64/test/index.html` | 95 | 2834 ms | 0.018 | 106 ms | — |
| `/mbti64/type/INFJ-A-O/index.html` | 98 | 2259 ms | 0 | 111 ms | — |

> 门禁：静态页 Performance ≥ 90 / LCP ≤ 2500ms / CLS ≤ 0.1 / TBT ≤ 300ms；客户端渲染页（答题页、结果页）LCP ≤ 3500ms（内容需等 React 水合）。
