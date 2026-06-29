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

describe("timestamp serialization in row mappers", () => {
  it("coerces created_at to an ISO string instead of leaking a node-pg Date", () => {
    const src = readFileSync(join(__dirname, "../queries.ts"), "utf8");
    // Must run through the serializer so client components receive a string —
    // a raw Date crosses the RSC boundary intact and breaks .localeCompare.
    expect(src).toMatch(/createdAt:\s*toIsoString\(r\.created_at\)/);
    expect(src).not.toMatch(/createdAt:\s*r\.created_at\b/);
  });
});
