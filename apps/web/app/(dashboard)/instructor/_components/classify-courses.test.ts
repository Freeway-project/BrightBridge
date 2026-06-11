import { describe, expect, it } from "vitest"
import { classifyInstructorCourses, bucketForStatus } from "./classify-courses"
import type { CourseStatus } from "@coursebridge/workflow"

function course(id: string, status: CourseStatus, updatedAt = "2026-01-01T00:00:00Z") {
  return { id, status, updatedAt }
}

describe("bucketForStatus", () => {
  it("treats the workflow's instructor-actionable statuses as needs_review", () => {
    expect(bucketForStatus("sent_to_instructor")).toBe("needs_review")
    expect(bucketForStatus("instructor_viewing")).toBe("needs_review")
  })

  it("treats approvals as approved", () => {
    expect(bucketForStatus("instructor_approved")).toBe("approved")
    expect(bucketForStatus("final_approved")).toBe("approved")
  })

  it("treats everything else (asked / pre-instructor) as waiting", () => {
    expect(bucketForStatus("instructor_questions")).toBe("waiting")
    expect(bucketForStatus("ta_review_in_progress")).toBe("waiting")
    expect(bucketForStatus("ready_for_instructor")).toBe("waiting")
  })
})

describe("classifyInstructorCourses", () => {
  it("splits courses into the three buckets", () => {
    const result = classifyInstructorCourses([
      course("a", "sent_to_instructor"),
      course("b", "instructor_viewing"),
      course("c", "instructor_questions"),
      course("d", "instructor_approved"),
      course("e", "final_approved"),
      course("f", "ready_for_instructor"),
    ])

    expect(result.needsReview.map((c) => c.course.id)).toEqual(["a", "b"])
    expect(result.waiting.map((c) => c.course.id).sort()).toEqual(["c", "f"])
    expect(result.approved.map((c) => c.course.id).sort()).toEqual(["d", "e"])
  })

  it("orders the review queue oldest-waiting first", () => {
    const result = classifyInstructorCourses([
      course("new", "sent_to_instructor", "2026-03-01T00:00:00Z"),
      course("old", "sent_to_instructor", "2026-01-01T00:00:00Z"),
    ])
    expect(result.needsReview.map((c) => c.course.id)).toEqual(["old", "new"])
  })

  it("attaches a plain-language action label", () => {
    const [a] = classifyInstructorCourses([course("a", "sent_to_instructor")]).needsReview
    expect(a.actionLabel).toBe("Ready for your review")
    const [q] = classifyInstructorCourses([course("q", "instructor_questions")]).waiting
    expect(q.actionLabel).toContain("asked a question")
  })

  it("handles an empty list", () => {
    const result = classifyInstructorCourses([])
    expect(result).toEqual({ needsReview: [], waiting: [], approved: [] })
  })
})
