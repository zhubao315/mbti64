import { Compass, HeartStraight, ShieldCheck, Sparkle } from "@phosphor-icons/react/dist/ssr";
import type { GroupKey } from "./Badge";

const GLYPHS = {
  analyst: Sparkle,
  diplomat: HeartStraight,
  guardian: ShieldCheck,
  adventurer: Compass,
} as const;

const TONES: Record<GroupKey, string> = {
  analyst: "bg-analyst-soft text-analyst-text",
  diplomat: "bg-diplomat-soft text-diplomat-text",
  guardian: "bg-guardian-soft text-guardian-text",
  adventurer: "bg-adventurer-soft text-adventurer-text",
};

/** 族群图形标签：全站唯一族群图标来源，避免各页重复维护映射表。 */
export default function GroupGlyph({ group, size = 40 }: { group: GroupKey; size?: number }) {
  const Icon = GLYPHS[group];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${TONES[group]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.52)} weight="duotone" />
    </span>
  );
}
