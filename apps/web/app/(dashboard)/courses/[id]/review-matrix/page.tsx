import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review";
import { notFound } from "next/navigation";
import { ReviewMatrixForm } from "../_components/review-matrix-form";
import type { ReviewMatrixFormValues } from "@/lib/workspace/schemas";
import type { IssueLogResponseData } from "@/lib/workspace/types";

const ALL_ITEM_IDS = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3"];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewMatrixPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId);
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

  const defaultValues: ReviewMatrixFormValues = {
    items: ALL_ITEM_IDS.map((item_id) => ({
      item_id,
      status: itemMap[item_id]?.status ?? "na",
      notes: itemMap[item_id]?.notes ?? "",
      direct_link: itemMap[item_id]?.direct_link ?? "",
    })),
    time_spent_seconds: saved.time_spent_seconds ?? 0,
  };

  const initialIssues = ((issueResponse?.response_data as Partial<IssueLogResponseData> | null)?.issues ?? []);

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 2 of 5 — Review Matrix" />
      <main className="flex-1 overflow-y-auto p-6">
        <ReviewMatrixForm
          courseId={id}
          defaultValues={defaultValues}
          initialIssues={initialIssues}
        />
      </main>
    </>
  );
}
