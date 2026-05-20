import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review";
import { notFound } from "next/navigation";
import { ReviewMatrixForm } from "../_components/review-matrix-form";
import type { ReviewMatrixFormValues } from "@/lib/workspace/schemas";
import type { IssueLogResponseData } from "@/lib/workspace/types";
import { CHECKLIST } from "@/lib/workspace/constants";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { refreshCourseWorkspace } from "@/app/(dashboard)/refresh-actions";

const ALL_ITEM_IDS = CHECKLIST.flatMap((s) => s.items.map((i) => i.id));
const TERM_CODE_SEASONS: Record<string, string> = {
  "10": "Winter",
  "11": "Winter",
  "20": "Summer",
  "21": "Spring",
  "22": "Summer",
  "30": "Fall",
  "31": "Fall",
};

interface Props {
  params: Promise<{ id: string }>;
}

function getCourseSubject(sourceCourseId: string | null): string {
  return sourceCourseId?.trim().match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? "";
}

function parseTermContext(term: string | null): { season: string; year: string } {
  const normalized = term?.trim() ?? "";
  const compact = normalized.match(/^(\d{4})(\d{2})$/);
  if (compact) {
    return {
      year: compact[1] ?? "",
      season: TERM_CODE_SEASONS[compact[2] ?? ""] ?? "",
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    const [first, second] = parts;
    if (/^\d{4}$/.test(first ?? "")) return { year: first ?? "", season: second ?? "" };
    return { season: first ?? "", year: second ?? "" };
  }

  return { season: "", year: "" };
}

export default async function ReviewMatrixPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId, ctx.profile.role);
  if (!course) notFound();

  const [matrixSection, issueSection] = await Promise.all([
    getReviewSectionByKey("review_matrix"),
    getReviewSectionByKey("general_notes"),
  ]);

  const [matrixResponse, issueResponse] = await Promise.all([
    matrixSection ? getReviewResponse(id, matrixSection.id) : null,
    issueSection ? getReviewResponse(id, issueSection.id) : null,
  ]);

  const saved = (matrixResponse?.response_data as Partial<ReviewMatrixFormValues> | null) ?? {};
  const itemMap = Object.fromEntries((saved.items ?? []).map((i) => [i.item_id, i]));
  const termContext = parseTermContext(course.term);

  const defaultValues: ReviewMatrixFormValues = {
    subject: saved.subject ?? getCourseSubject(course.sourceCourseId),
    season: saved.season ?? termContext.season,
    year: saved.year ?? termContext.year,
    items: ALL_ITEM_IDS.map((item_id) => ({
      item_id,
      status: itemMap[item_id]?.status ?? "na",
      notes: itemMap[item_id]?.notes ?? "",
      direct_link: itemMap[item_id]?.direct_link ?? "",
    })),
    time_spent_seconds: saved.time_spent_seconds ?? 0,
    overall_time_spent_seconds: saved.overall_time_spent_seconds ?? 0,
  };

  const initialIssues = ((issueResponse?.response_data as Partial<IssueLogResponseData> | null)?.issues ?? []);

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 2 of 5 — Review Matrix" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Review Matrix"
          refreshCallback={refreshCourseWorkspace.bind(null, id)}
        >
          <ReviewMatrixForm
            courseId={id}
            defaultValues={defaultValues}
            initialIssues={initialIssues}
          />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
