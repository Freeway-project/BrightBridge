import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { notFound } from "next/navigation";
import { IssueTracker } from "../_components/issues/issue-tracker";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { refreshCourseWorkspace } from "@/app/(dashboard)/refresh-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssueLogPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId, ctx.profile.role);
  if (!course) notFound();

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 4 of 5 — Issue Log" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Issues"
          refreshCallback={refreshCourseWorkspace.bind(null, id)}
        >
          <IssueTracker courseId={id} phase="migration" userRole={ctx.profile.role} />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
