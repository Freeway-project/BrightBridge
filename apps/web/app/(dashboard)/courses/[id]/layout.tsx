import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponses, getReviewSectionByKey } from "@/lib/services/review";
import { getEscalationsForCourse } from "@/lib/services/escalations";
import { getCourseInstructor } from "@/lib/services/profiles";
import { getCourseComments } from "@/lib/services/comments";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { CourseLayoutClient } from "./_components/course-layout-client";

const SECTIONS = [
  { key: "course_metadata", label: "Metadata" },
  { key: "review_matrix", label: "Review Matrix" },
  { key: "syllabus_review", label: "Syllabus & GB" },
  { key: "general_notes", label: "Issue Log" },
] as const;

interface CourseWorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function CourseWorkspaceLayout({
  children,
  params,
}: CourseWorkspaceLayoutProps) {
  const { id } = await params;
  const ctx = await requireProfile();
  const course = await getCourseById(id, ctx.userId, ctx.profile.role);

  if (!course) notFound();

  const [responses, escalations, instructor, comments] = await Promise.all([
    getReviewResponses(id),
    getEscalationsForCourse(id),
    getCourseInstructor(id),
    getCourseComments(id),
  ]);
  const respondedSectionIds = new Set(
    responses
      .filter((r) => r.response_data && Object.keys(r.response_data).length > 0)
      .map((r) => r.section_id),
  );

  const sectionMeta = await Promise.all(
    SECTIONS.map(async ({ key, label }) => {
      const s = await getReviewSectionByKey(key);
      return { key, label, complete: s ? respondedSectionIds.has(s.id) : false };
    }),
  );

  const lastSavedAt =
    responses.reduce<string | null>((latest, r) => {
      if (!latest) return r.updated_at;
      return r.updated_at > latest ? r.updated_at : latest;
    }, null) ?? null;

  return (
    <CourseLayoutClient
      courseId={id}
      courseTitle={course.title}
      courseStatus={course.status}
      reviewerName={ctx.profile.fullName ?? ctx.email ?? ""}
      reviewerId={ctx.userId}
      instructorName={instructor?.fullName ?? instructor?.email ?? null}
      progress={sectionMeta}
      lastSavedAt={lastSavedAt}
      escalations={escalations}
      comments={comments}
    >
      {children}
    </CourseLayoutClient>
  );
}
