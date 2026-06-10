/**
 * Brightspace Content Converter — client-safe template metadata.
 *
 * These values (the template enum, labels, descriptions, and type guard) are
 * needed by both the browser UI and the server route, so they must NOT be in the
 * `server-only` module. The heavy server-side template/prompt/HTML logic lives in
 * `./templates`, which re-exports everything here for server callers.
 */

export type ConverterTemplate =
  | "syllabus"
  | "introduction"
  | "content"
  | "video"
  | "discussion"
  | "assignment"
  | "quiz"
  | "conclusion"

export const TEMPLATE_LABELS: Record<ConverterTemplate, string> = {
  syllabus: "Course Syllabus",
  introduction: "Module Introduction",
  content: "Content Page",
  video: "Video Lecture",
  discussion: "Discussion",
  assignment: "Assignment",
  quiz: "Quiz",
  conclusion: "Conclusion",
}

export const TEMPLATE_DESCRIPTIONS: Record<ConverterTemplate, string> = {
  syllabus: "Interactive accordion layout with instructor info, schedule, evaluation, and policies.",
  introduction: "Module introduction with learning outcomes, recommended materials, and assessment callout.",
  content: "General-purpose content page with headings, text blocks, and a callout box.",
  video: "Video lecture page with an embedded video player and a follow-up activity section.",
  discussion: "Discussion prompt page with instructions and a discussion link placeholder.",
  assignment: "Assignment instructions page with details and a submission link placeholder.",
  quiz: "Quiz instructions page with details and a quiz link placeholder.",
  conclusion: "Module wrap-up page summarising learning and directing students to the next step.",
}

export function isConverterTemplate(value: unknown): value is ConverterTemplate {
  return typeof value === "string" && value in TEMPLATE_LABELS
}
