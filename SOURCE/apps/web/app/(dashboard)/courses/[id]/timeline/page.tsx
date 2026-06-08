import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getCourseTimeline } from "@/lib/courses/timeline";
import { CourseTimeline } from "@/components/courses/course-timeline";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TimelinePage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId, ctx.profile.role);
  if (!course) notFound();

  const timeline = await getCourseTimeline(id, { includeInternalComments: true });

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Activity Timeline" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-hidden p-6">
        <CourseTimeline items={timeline} />
      </main>
    </>
  );
}
