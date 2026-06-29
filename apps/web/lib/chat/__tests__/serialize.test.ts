import { describe, it, expect } from "vitest"
import { toIsoString, toIsoStringOrNull } from "../serialize"

describe("chat timestamp serialization", () => {
  it("converts a node-pg Date to an ISO string", () => {
    const out = toIsoString(new Date("2026-06-29T12:34:56.000Z"))
    expect(typeof out).toBe("string")
    expect(out).toBe("2026-06-29T12:34:56.000Z")
  })

  it("passes an existing ISO string through unchanged", () => {
    expect(toIsoString("2026-06-29T12:34:56.000Z")).toBe("2026-06-29T12:34:56.000Z")
  })

  it("reproduces the fix: the result supports String methods (the original crash was .localeCompare on a Date)", () => {
    const out = toIsoString(new Date("2026-06-29T00:00:00.000Z"))
    expect(() => out.localeCompare("2026-06-30")).not.toThrow()
    // ISO-8601 UTC strings sort chronologically under lexicographic compare.
    expect(out.localeCompare("2026-06-30T00:00:00.000Z")).toBeLessThan(0)
  })

  it("preserves SQL NULLs as null for nullable columns", () => {
    expect(toIsoStringOrNull(null)).toBeNull()
    expect(toIsoStringOrNull(undefined)).toBeNull()
  })

  it("converts a Date for nullable columns", () => {
    expect(toIsoStringOrNull(new Date("2026-01-02T03:04:05.000Z"))).toBe("2026-01-02T03:04:05.000Z")
  })
})
