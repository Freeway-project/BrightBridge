import { describe, it, expect } from "vitest"
import {
  isBirthdayUser,
  isBirthdayToday,
  AVA_USER_ID,
  BIRTHDAY_DATE,
  BIRTHDAY_ENABLED,
} from "../config"

// Noon UTC on the birthday lands on the same calendar day in PT and UTC,
// keeping these assertions stable regardless of the evaluation timezone.
const onBirthday = new Date(`${BIRTHDAY_DATE}T19:00:00Z`)
const otherDay = new Date("2026-07-04T19:00:00Z")
const SOMEONE_ELSE = "00000000-0000-0000-0000-000000000000"

describe("isBirthdayToday", () => {
  it("is true on the configured date", () => {
    expect(isBirthdayToday(onBirthday)).toBe(true)
  })

  it("is false on any other date", () => {
    expect(isBirthdayToday(otherDay)).toBe(false)
  })
})

describe("isBirthdayUser", () => {
  it("matches Ava on her birthday (when the feature is enabled)", () => {
    // Tracks the master switch so toggling BIRTHDAY_ENABLED never breaks the suite.
    expect(isBirthdayUser({ id: AVA_USER_ID }, onBirthday)).toBe(BIRTHDAY_ENABLED)
  })

  it("never matches Ava on a different day", () => {
    expect(isBirthdayUser({ id: AVA_USER_ID }, otherDay)).toBe(false)
  })

  it("never matches another user, even on the birthday", () => {
    expect(isBirthdayUser({ id: SOMEONE_ELSE }, onBirthday)).toBe(false)
  })

  it("handles missing profiles safely", () => {
    expect(isBirthdayUser(null, onBirthday)).toBe(false)
    expect(isBirthdayUser(undefined, onBirthday)).toBe(false)
  })
})
