// TypeScript types for response_data stored in review_responses.response_data (JSONB).
// One type per review section key.

// ── Step 1: course_metadata ─────────────────────────────────────────────────

export type MetadataResponseData = {
  term: string;
  section_numbers: string[];
  brightspace_url: string;
  moodle_url: string;
  migration_notes: string;
  time_required_seconds: number;
  overall_time_spent_seconds: number;
};

// ── Step 2: review_matrix ────────────────────────────────────────────────────

export type ReviewMatrixStatus = "pass" | "fix_needed" | "missing" | "escalate" | "na";

export type ReviewMatrixItem = {
  item_id: string;
  status: ReviewMatrixStatus;
  notes: string;
  direct_link: string;
};

export type ReviewMatrixResponseData = {
  items: ReviewMatrixItem[];
  time_spent_seconds: number;
  overall_time_spent_seconds: number;
};

// ── Step 3: syllabus_review + gradebook_review ───────────────────────────────

export type SyllabusRowStatus = "confirmed" | "fix_needed" | "pending";

export type SyllabusItem = {
  item_id: string;
  ta_status: SyllabusRowStatus;
  notes: string;
  direct_link: string;
};

export type GradebookItem = {
  item_id: string;
  status: ReviewMatrixStatus;
  notes: string;
  direct_link: string;
};

export type SyllabusGradebookResponseData = {
  instructor_id: string;
  instructor_email: string;
  syllabus_items: SyllabusItem[];
  gradebook_items: GradebookItem[];
  time_spent_seconds: number;
  overall_time_spent_seconds: number;
};

// ── Step 4: issue_log (stored under general_notes section key) ───────────────

export type IssueSeverity = "minor" | "major" | "critical";
export type IssueStatus = "open" | "fixed" | "escalated" | "resolved";

export type Issue = {
  id: string;
  type: string;
  location: string;
  severity: IssueSeverity;
  owner: string;
  status: IssueStatus;
  description: string;
  direct_link: string;
  created_at: string;
};

export type IssueLogResponseData = {
  issues: Issue[];
};

// ── Section key → response_data type map ────────────────────────────────────

export type SectionResponseDataMap = {
  course_metadata: MetadataResponseData;
  review_matrix: ReviewMatrixResponseData;
  syllabus_review: SyllabusGradebookResponseData;
  gradebook_review: SyllabusGradebookResponseData;
  general_notes: IssueLogResponseData;
};

export type SectionKey = keyof SectionResponseDataMap;
