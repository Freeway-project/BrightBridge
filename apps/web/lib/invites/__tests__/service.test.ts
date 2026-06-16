import { describe, it, expect } from "vitest";
import { shouldBlockExpired, shouldBlockAccepted } from "../service";

describe("shouldBlockExpired", () => {
  it("blocks when expires_at is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(shouldBlockExpired(past)).toBe(true);
  });

  it("does not block when expires_at is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(shouldBlockExpired(future)).toBe(false);
  });

  it("never blocks when expires_at is null (never-expiring)", () => {
    expect(shouldBlockExpired(null)).toBe(false);
  });
});

describe("shouldBlockAccepted", () => {
  it("blocks one-time links that have been accepted", () => {
    expect(shouldBlockAccepted("2026-06-14T10:00:00Z", "2026-06-15T00:00:00Z")).toBe(true);
  });

  it("does not block never-expiring links even if accepted_at is set", () => {
    expect(shouldBlockAccepted(null, "2026-06-15T00:00:00Z")).toBe(false);
  });

  it("does not block one-time links that have not been accepted yet", () => {
    expect(shouldBlockAccepted("2026-06-15T00:00:00Z", null)).toBe(false);
  });
});
