export * from "./repositories/contracts"
export type { CourseStatus } from "@coursebridge/workflow"

// Alias common types used in the UI
import type { CourseSummary, CourseComment, CourseEscalation } from "./repositories/contracts"
export type Course = CourseSummary
export type Comment = CourseComment
export type Escalation = CourseEscalation
