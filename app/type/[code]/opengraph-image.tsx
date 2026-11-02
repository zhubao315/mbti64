import { ImageResponse } from "next/og";
import { TYPE_CODES, getType } from "@/data/types64";
import { GROUP_META } from "@/data/schema";
import { PRIOR_TABLE, RARITY_TIERS } from "@/lib/rarity";

/**
 * 型别页 OG 图（构建期静态生成 64 张 PNG）
 *
 * 只使用拉丁字母与数字：CJK 字体体积过大，打进构建产物会显著拖慢构建且易失败。
 * 中文文案留给页面本身，社交卡片靠 code + 族群英文名 + 稀有度来传达信息。
 *
 * 注意：satori（next/og 的渲染器）要求「多子节点的 div 必须显式声明 display: flex」。
 * 因此这里所有容器都写死 display，且避免用「文本 + 表达式 + 文本」拼一个 div。
 */

export const alt = "64 Personalities CN";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

/** 静态导出时 OG 图必须显式列出所有参数，否则构建失败 */
export function generateStaticParams() {
  return TYPE_CODES.map((code) => ({ code }));
}

export default function TypeOgImage({ params }: { params: { code: string } }) {
  const type = getType(params.code);
  const group = GROUP_META[type.group];
  const rarity = PRIOR_TABLE.byCode[type.code];
  const tier = rarity?.tier ?? RARITY_TIERS[2];
  const tierIndex = raryTierIndex(rarity?.tier.key);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #1C1630 0%, #2B2540 45%, #3A2A5C 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            display: "flex",
            borderRadius: 520,
            background: `${group.color}66`,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -140,
            width: 520,
            height: 520,
            display: "flex",
            borderRadius: 520,
            background: "#FF8A8A55",
            filter: "blur(100px)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "linear-gradient(135deg, #7C5CFF, #FF8A8A)",
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            64
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>
              64 PERSONALITIES CN
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "#B7A6FF", letterSpacing: 4 }}>
              RARITY TEST
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#B7A6FF", letterSpacing: 2 }}>
            {group.en.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 168, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>
            {type.code.replace(/-/g, " ")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 24px",
                borderRadius: 999,
                border: `2px solid ${tier.color}`,
                background: `${tier.color}22`,
                color: "#FFFFFF",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {tier.en.toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#D6D2E6" }}>
              {`RANK ${rarity?.rankLabel ?? "-"} / 64`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {RARITY_TIERS.map((t, i) => (
              <div
                key={t.key}
                style={{
                  width: 34,
                  height: 12,
                  display: "flex",
                  borderRadius: 6,
                  background: i === tierIndex ? "#FFFFFF" : "#FFFFFF33",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#8B85A0" }}>FOR ENTERTAINMENT ONLY</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function raryTierIndex(key: string | undefined): number {
  if (!key) return 2;
  const i = RARITY_TIERS.findIndex((t) => t.key === key);
  return i === -1 ? 2 : i;
}
