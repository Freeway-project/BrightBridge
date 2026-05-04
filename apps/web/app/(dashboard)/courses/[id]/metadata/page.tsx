import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review";
import { notFound } from "next/navigation";
import { MetadataForm } from "../_components/metadata-form";
import type { MetadataFormValues } from "@/lib/workspace/schemas";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { refreshCourseWorkspace } from "@/app/(dashboard)/refresh-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MetadataPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId);
  if (!course) notFound();

  const section = await getReviewSectionByKey("course_metadata");
  const existing = section ? await getReviewResponse(id, section.id) : null;

  const defaultValues: MetadataFormValues = {
    term: "",
    section_numbers: [],
    brightspace_url: "",
    moodle_url: "",
    migration_notes: "",
    overall_time_spent_seconds: 0,
    ...((existing?.response_data ?? {}) as Partial<MetadataFormValues>),
  };

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 1 of 5 — Metadata" />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Metadata Review"
          refreshCallback={() => refreshCourseWorkspace(id)}
        >
          <MetadataForm
            course={course}
            reviewerName={ctx.profile.fullName ?? ctx.email ?? ""}
            defaultValues={defaultValues}
          />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
