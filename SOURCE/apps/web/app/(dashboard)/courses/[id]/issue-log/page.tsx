import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { notFound } from "next/navigation";
import { IssueTracker } from "../_components/issues/issue-tracker";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { FinalSummaryEditor } from "@/components/shared/final-summary-editor";
import { getFinalSummaryNotes } from "@/lib/courses/final-summary";

const SUMMARY_EDITABLE_STATUSES = ["waiting_on_admin", "staging_in_progress"];
const ADMIN_ROLES = ["admin_full", "admin_viewer", "super_admin"];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssueLogPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId, ctx.profile.role);
  if (!course) notFound();

  const summaryNotes = await getFinalSummaryNotes(id);
  const summaryEditable =
    SUMMARY_EDITABLE_STATUSES.includes(course.status) &&
    (ctx.profile.role === "standard_user" || ADMIN_ROLES.includes(ctx.profile.role));

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 4 of 5 — Issue Log" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Issues"
        >
          <div className="space-y-[var(--card-spacing,1.5rem)]">
            <FinalSummaryEditor courseId={id} initialNotes={summaryNotes} editable={summaryEditable} />
            <IssueTracker courseId={id} phase="migration" userRole={ctx.profile.role} courseStatus={course.status} />
          </div>
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
