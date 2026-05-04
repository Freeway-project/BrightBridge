import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review";
import { notFound } from "next/navigation";
import { IssueLogTable } from "../_components/issue-log-table";
import type { IssueLogResponseData } from "@/lib/workspace/types";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { refreshCourseWorkspace } from "@/app/(dashboard)/refresh-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssueLogPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId);
  if (!course) notFound();

  const section = await getReviewSectionByKey("general_notes");
  const existing = section ? await getReviewResponse(id, section.id) : null;
  const data = (existing?.response_data ?? {}) as Partial<IssueLogResponseData>;

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 4 of 5 — Issue Log" />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Issue Log"
          refreshCallback={refreshCourseWorkspace.bind(null, id)}
        >
          <IssueLogTable courseId={id} defaultIssues={data.issues ?? []} />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
