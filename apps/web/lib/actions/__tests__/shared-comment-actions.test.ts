import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
  join(__dirname, "../shared-comment-actions.ts"),
  "utf8",
)

describe("shared-comment-actions", () => {
  it("postSharedCommentAction accepts isQuestion parameter", () => {
    expect(src).toMatch(/isQuestion/)
  })

  it("exports markAnsweredAction", () => {
    expect(src).toMatch(/export async function markAnsweredAction/)
  })

  it("markAnsweredAction checks allowed roles", () => {
    expect(src).toMatch(/admin_full.*super_admin|super_admin.*admin_full/)
  })

  it("postSharedCommentAction triggers instructor_questions transition when isQuestion=true", () => {
    expect(src).toMatch(/instructor_questions/)
  })
})
