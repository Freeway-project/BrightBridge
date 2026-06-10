import { describe, expect, it } from "vitest";
import { ChatPermissionError } from "../types";

describe("ChatPermissionError", () => {
  it("has a default message", () => {
    expect(new ChatPermissionError().message).toMatch(/member/i);
  });
  it("is an Error", () => {
    expect(new ChatPermissionError()).toBeInstanceOf(Error);
  });
});
