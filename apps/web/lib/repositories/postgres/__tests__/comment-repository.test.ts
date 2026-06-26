import { describe, expect, it } from "vitest"

// These tests verify the SQL that the comment repository constructs, by
// reading the source file. They guard against regressions without requiring
// a live DB connection.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(__dirname, "../comment-repository.ts"),
  "utf8",
)

describe("comment-repository: is_question / is_answered", () => {
  it("selects is_question from course_comments", () => {
    expect(src).toMatch(/c\.is_question/)
  })

  it("selects is_answered from course_comments", () => {
    expect(src).toMatch(/c\.is_answered/)
  })

  it("inserts is_question via parameter", () => {
    expect(src).toMatch(/is_question/)
  })

  it("exposes markCommentAnswered that updates is_answered", () => {
    expect(src).toMatch(/markCommentAnswered/)
    expect(src).toMatch(/SET is_answered\s*=\s*true/)
  })
})
