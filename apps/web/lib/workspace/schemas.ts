import { z } from "zod";

// ── Step 1: Metadata ─────────────────────────────────────────────────────────

export const metadataSchema = z.object({
  term: z.string().min(1, "Term is required"),
  section_numbers: z.array(z.string()),
  brightspace_url: z.string().url("Must be a valid URL").or(z.literal("")),
  moodle_url: z.string().url("Must be a valid URL").or(z.literal("")),
  migration_notes: z.string().min(1, "Migration notes are required"),
  time_required_seconds: z.number().int().nonnegative(),
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
  items: z.array(reviewMatrixItemSchema),
}).superRefine((data, ctx) => {
  data.items.forEach((item, index) => {
    if (
      ["fix_needed", "missing", "escalate"].includes(item.status) &&
      item.notes.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes are required for this status",
        path: ["items", index, "notes"],
      });
    }
  });
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
  instructor_id: z.string(),
  instructor_email: z.string(),
  syllabus_items: z.array(syllabusItemSchema),
  gradebook_items: z.array(gradebookItemSchema),
}).superRefine((data, ctx) => {
  data.gradebook_items.forEach((item, index) => {
    if (
      ["fix_needed", "missing", "escalate"].includes(item.status) &&
      item.notes.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes are required for this status",
        path: ["gradebook_items", index, "notes"],
      });
    }
  });
});

export type SyllabusGradebookFormValues = z.infer<typeof syllabusGradebookSchema>;

// ── Step 4: Issue Log ────────────────────────────────────────────────────────

export const issueSchema = z.object({
  id: z.string(),
  type: z.string().min(1, "Type is required"),
  location: z.string().min(1, "Location is required"),
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
