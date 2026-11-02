import { ImageResponse } from "next/og";
import { RARITY_TIERS } from "@/lib/rarity";

/**
 * 站点默认 OG 图（首页 / 榜单 / 测评页共用）
 * 只用拉丁字母与数字，原因见 app/type/[code]/opengraph-image.tsx。
 */

export const alt = "64 Personalities CN - Rarity Test";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
            top: -200,
            right: -140,
            width: 560,
            height: 560,
            display: "flex",
            borderRadius: 560,
            background: "#7C5CFF66",
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -160,
            width: 560,
            height: 560,
            display: "flex",
            borderRadius: 560,
            background: "#FF8A8A55",
            filter: "blur(110px)",
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
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
            64 PERSONALITIES CN
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 900, lineHeight: 1.02, letterSpacing: -3 }}>
            HOW RARE
          </div>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 900, lineHeight: 1.02, letterSpacing: -3 }}>
            IS YOUR TYPE?
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#B7A6FF" }}>
            64 TYPES · 6 DIMENSIONS · 7 RARITY TIERS
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {RARITY_TIERS.map((t) => (
              <div
                key={t.key}
                style={{ width: 92, height: 12, display: "flex", borderRadius: 6, background: t.color }}
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
