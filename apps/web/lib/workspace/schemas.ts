import { z } from "zod";

// ── Step 1: Metadata ─────────────────────────────────────────────────────────

export const metadataSchema = z.object({
  term: z.string(),
  section_numbers: z.array(z.string()),
  migration_notes: z.string(),
  overall_time_spent_seconds: z.number().int().nonnegative(),
});

export type MetadataFormValues = z.infer<typeof metadataSchema>;

// ── Step 2: Review Matrix ────────────────────────────────────────────────────

const reviewMatrixStatusEnum = z.enum(["pass", "fix_needed", "missing", "escalate", "na"]);

const reviewMatrixItemSchema = z.object({
  item_id: z.string(),
  status: reviewMatrixStatusEnum,
  notes: z.string(),
  direct_link: z.string(),
});

export const reviewMatrixSchema = z.object({
  subject: z.string(),
  season: z.string(),
  year: z.string(),
  items: z.array(reviewMatrixItemSchema),
  time_spent_seconds: z.number().int().nonnegative(),
  overall_time_spent_seconds: z.number().int().nonnegative(),
});

export type ReviewMatrixFormValues = z.infer<typeof reviewMatrixSchema>;

// ── Step 3: Syllabus & Gradebook ─────────────────────────────────────────────

const syllabusRowStatusEnum = z.enum(["confirmed", "fix_needed", "pending"]);

const syllabusItemSchema = z.object({
  item_id: z.string(),
  ta_status: syllabusRowStatusEnum,
  notes: z.string(),
  direct_link: z.string(),
});

const gradebookItemSchema = z.object({
  item_id: z.string(),
  status: reviewMatrixStatusEnum,
  notes: z.string(),
  direct_link: z.string(),
});

export const syllabusGradebookSchema = z.object({
  instructor_id: z.string().optional(),
  instructor_email: z.string().optional(),
  syllabus_items: z.array(syllabusItemSchema),
  gradebook_items: z.array(gradebookItemSchema),
  time_spent_seconds: z.number().int().nonnegative(),
  overall_time_spent_seconds: z.number().int().nonnegative(),
});

export type SyllabusGradebookFormValues = z.infer<typeof syllabusGradebookSchema>;

// ── Step 4: Issue Log ────────────────────────────────────────────────────────

export const issueSchema = z.object({
  id: z.string(),
  type: z.string(),
  location: z.string(),
  severity: z.enum(["minor", "major", "critical"]),
  owner: z.string(),
  status: z.enum(["open", "fixed", "escalated", "resolved"]),
  description: z.string(),
  direct_link: z.string(),
  created_at: z.string(),
});

export const issueLogSchema = z.object({
  issues: z.array(issueSchema),
});

export type IssueLogFormValues = z.infer<typeof issueLogSchema>;
export type IssueFormValues = z.infer<typeof issueSchema>;
