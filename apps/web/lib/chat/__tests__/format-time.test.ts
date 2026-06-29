import { describe, it, expect } from "vitest"
import {
  formatMessageTime,
  formatFullDateTime,
  formatDaySeparator,
  formatConversationTime,
} from "../format-time"

// Fixed reference "now" so the relative helpers are deterministic.
// vitest.config sets TZ=UTC, so all formatting below is in UTC.
const NOW = new Date("2026-06-29T12:00:00Z") // Monday

describe("formatMessageTime", () => {
  it("renders 12-hour time with AM/PM", () => {
    expect(formatMessageTime("2026-06-29T09:05:00Z")).toBe("9:05 AM")
    expect(formatMessageTime("2026-06-29T13:30:00Z")).toBe("1:30 PM")
    expect(formatMessageTime("2026-06-29T00:00:00Z")).toBe("12:00 AM")
  })
})

describe("formatFullDateTime", () => {
  it("renders an absolute date and time for tooltips", () => {
    expect(formatFullDateTime("2026-06-29T09:05:00Z")).toBe("Jun 29, 2026, 9:05 AM")
  })
})

describe("formatDaySeparator", () => {
  it("labels the current day", () => {
    expect(formatDaySeparator("2026-06-29T09:05:00Z", NOW)).toBe("Today")
  })

  it("labels the previous day", () => {
    expect(formatDaySeparator("2026-06-28T10:00:00Z", NOW)).toBe("Yesterday")
  })

  it("uses the weekday name within the past week", () => {
    expect(formatDaySeparator("2026-06-26T10:00:00Z", NOW)).toBe("Friday")
  })

  it("uses month + day earlier in the same year", () => {
    expect(formatDaySeparator("2026-03-15T10:00:00Z", NOW)).toBe("Mar 15")
  })

  it("includes the year for a different year", () => {
    expect(formatDaySeparator("2025-12-31T10:00:00Z", NOW)).toBe("Dec 31, 2025")
  })
})

describe("formatConversationTime", () => {
  it("returns an empty string when there is no last message", () => {
    expect(formatConversationTime(null, NOW)).toBe("")
  })

  it("shows 'now' under a minute", () => {
    expect(formatConversationTime("2026-06-29T11:59:40Z", NOW)).toBe("now")
  })

  it("shows minutes under an hour", () => {
    expect(formatConversationTime("2026-06-29T11:45:00Z", NOW)).toBe("15m")
  })

  it("shows hours later the same day", () => {
    expect(formatConversationTime("2026-06-29T09:05:00Z", NOW)).toBe("2h")
  })

  it("shows 'Yesterday' for the previous day", () => {
    expect(formatConversationTime("2026-06-28T10:00:00Z", NOW)).toBe("Yesterday")
  })

  it("shows the short weekday within the past week", () => {
    expect(formatConversationTime("2026-06-26T10:00:00Z", NOW)).toBe("Fri")
  })

  it("shows month + day earlier in the same year", () => {
    expect(formatConversationTime("2026-03-15T10:00:00Z", NOW)).toBe("Mar 15")
  })

  it("includes the year for a different year", () => {
    expect(formatConversationTime("2025-12-31T10:00:00Z", NOW)).toBe("Dec 31, 2025")
  })
})
