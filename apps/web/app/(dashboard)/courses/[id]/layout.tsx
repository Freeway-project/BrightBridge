import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponses, getReviewSectionByKey } from "@/lib/services/review";
import { WorkspaceNav } from "./_components/workspace-nav";
import { InfoPanel } from "./_components/info-panel";

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
  const course = await getCourseById(id, ctx.userId);

  if (!course) notFound();

  const responses = await getReviewResponses(id);
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
    <div className="flex flex-1 overflow-hidden">
      <WorkspaceNav
        courseId={id}
        courseTitle={course.title}
        courseStatus={course.status}
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      <InfoPanel
        courseStatus={course.status}
        reviewerName={ctx.profile.fullName ?? ctx.email ?? ""}
        progress={sectionMeta}
        lastSavedAt={lastSavedAt}
      />
    </div>
  );
}
