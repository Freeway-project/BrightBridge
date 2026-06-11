import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("searchMessages query text", () => {
  it("always scopes by conversation_members of the caller", () => {
    const src = readFileSync(join(__dirname, "../queries.ts"), "utf8");
    expect(src).toMatch(/conversation_members[\s\S]+user_id\s*=\s*\$1[\s\S]+removed_at is null/);
  });

  it("filters deleted_at", () => {
    const src = readFileSync(join(__dirname, "../queries.ts"), "utf8");
    expect(src).toMatch(/deleted_at is null/);
  });
});
