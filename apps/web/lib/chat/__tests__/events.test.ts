import { afterEach, describe, expect, it, vi } from "vitest";
import { events } from "../events";

describe("events bus", () => {
  afterEach(() => events.__resetForTests());

  it("delivers published events to subscribers", () => {
    const fn = vi.fn();
    events.subscribe("c1", fn);
    events.publish("c1", "message", { body: "hi" });
    expect(fn).toHaveBeenCalledWith({ type: "message", payload: { body: "hi" } });
  });

  it("does not deliver to other conversation ids", () => {
    const fn = vi.fn();
    events.subscribe("c1", fn);
    events.publish("c2", "message", {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("unsubscribe removes the listener — no leak", () => {
    const fn = vi.fn();
    const off = events.subscribe("c1", fn);
    off();
    events.publish("c1", "message", {});
    expect(fn).not.toHaveBeenCalled();
    expect(events.__listenerCount("c1")).toBe(0);
  });
});
