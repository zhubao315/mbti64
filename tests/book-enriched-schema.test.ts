import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BookEnrichedSchema } from "@/lib/book-enriched-schema.mjs";

describe("bookEnriched.json schema 同步", () => {
  it("实际 JSON 文件能通过 Zod schema 校验", () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), "data", "bookEnriched.json"), "utf8"),
    );
    const res = BookEnrichedSchema.safeParse(raw);
    if (!res.success) {
      console.error(res.error.issues);
    }
    expect(res.success).toBe(true);
  });

  it("schema 与 JSON 的型别数量一致", () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), "data", "bookEnriched.json"), "utf8"),
    );
    expect(Object.keys(raw.types)).toHaveLength(16);
    for (const t of Object.values(raw.types)) {
      expect(Object.keys((t as { spiralStage: object }).spiralStage)).toHaveLength(4);
    }
  });
});