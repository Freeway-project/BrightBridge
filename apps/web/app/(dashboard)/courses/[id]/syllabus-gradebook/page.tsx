import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getProfilesByRole } from "@/lib/services/profiles";
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review";
import { notFound } from "next/navigation";
import { SyllabusGradebookForm } from "../_components/syllabus-gradebook-form";
import type { SyllabusGradebookFormValues } from "@/lib/workspace/schemas";
import { SYLLABUS_ITEMS_LIST, GRADEBOOK_ITEMS_LIST } from "@/lib/workspace/constants";
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper";
import { refreshCourseWorkspace } from "@/app/(dashboard)/refresh-actions";

const SYLLABUS_IDS = SYLLABUS_ITEMS_LIST.map((i) => i.id);
const GRADEBOOK_IDS = GRADEBOOK_ITEMS_LIST.map((i) => i.id);

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SyllabusGradebookPage({ params }: Props) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId);
  if (!course) notFound();

  const [section, instructors] = await Promise.all([
    getReviewSectionByKey("syllabus_review"),
    getProfilesByRole("instructor"),
  ]);
  const existing = section ? await getReviewResponse(id, section.id) : null;
  const saved = (existing?.response_data ?? {}) as Partial<SyllabusGradebookFormValues>;

  const defaultValues: SyllabusGradebookFormValues = {
    instructor_id: saved.instructor_id ?? "",
    instructor_email: saved.instructor_email ?? "",
    syllabus_items: SYLLABUS_IDS.map((item_id) => {
      const found = saved.syllabus_items?.find((i) => i.item_id === item_id);
      return { item_id, ta_status: found?.ta_status ?? "pending", notes: found?.notes ?? "", direct_link: found?.direct_link ?? "" };
    }),
    gradebook_items: GRADEBOOK_IDS.map((item_id) => {
      const found = saved.gradebook_items?.find((i) => i.item_id === item_id);
      return { item_id, status: found?.status ?? "na", notes: found?.notes ?? "", direct_link: found?.direct_link ?? "" };
    }),
    time_spent_seconds: saved.time_spent_seconds ?? 0,
    overall_time_spent_seconds: saved.overall_time_spent_seconds ?? 0,
  };

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 3 of 5 — Syllabus & Gradebook" />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Syllabus & Gradebook Review"
          refreshCallback={refreshCourseWorkspace.bind(null, id)}
        >
          <SyllabusGradebookForm
            courseId={id}
            defaultValues={defaultValues}
            instructors={instructors}
          />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  );
}
