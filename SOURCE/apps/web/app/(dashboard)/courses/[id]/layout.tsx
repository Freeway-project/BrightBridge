import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/context";
import { getCourseById } from "@/lib/services/courses";
import { getReviewResponses, getReviewSectionByKey } from "@/lib/services/review";
import { getEscalationsForCourse } from "@/lib/services/escalations";
import { getCourseInstructor } from "@/lib/services/profiles";
import { getCourseComments } from "@/lib/services/comments";
import { getOpenIssuesCountAction } from "@/lib/issues";
import { WorkspaceNav } from "./_components/workspace-nav";
import { InfoPanel } from "./_components/info-panel";
import { TweakableContent } from "@/components/shared/tweakable-content";
import { MilestoneReward } from "@/components/milestone-reward/MilestoneReward";
import { ScreenMeteors } from "@/components/shared/screen-meteors";

const SECTIONS = [
  { key: "course_metadata", label: "Metadata" },
  { key: "review_matrix", label: "Review Matrix" },
  { key: "syllabus_review", label: "Syllabus & GB" },
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

  const [responses, escalations, instructor, comments, openIssueCount] = await Promise.all([
    getReviewResponses(id),
    getEscalationsForCourse(id),
    getCourseInstructor(id),
    getCourseComments(id),
    getOpenIssuesCountAction(id),
  ]);
  const respondedSectionIds = new Set(
    responses
      .filter((r) => r.response_data && Object.keys(r.response_data).length > 0)
      .map((r) => r.section_id),
  );

  const reviewSectionMeta = await Promise.all(
    SECTIONS.map(async ({ key, label }) => {
      const s = await getReviewSectionByKey(key);
      return { key, label, complete: s ? respondedSectionIds.has(s.id) : false };
    }),
  );

  const sectionMeta = [
    ...reviewSectionMeta,
    { key: "issues", label: "Issues", complete: openIssueCount === 0 },
  ];

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
        reviewerName={ctx.profile.fullName ?? ctx.email ?? ""}
        instructorName={instructor?.fullName ?? instructor?.email ?? null}
      />
      <TweakableContent className="relative flex flex-1 flex-col overflow-hidden bg-card/[0.01]">
        {/* Animated Background blobs for Apple glassmorphism - completely theme-adaptive */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Blob 1 - uses primary accent color */}
          <div className="absolute -top-[10%] left-[5%] w-[40%] h-[50%] rounded-full bg-primary/[0.03] dark:bg-primary/[0.015] blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
          {/* Blob 2 - uses secondary accent color */}
          <div className="absolute top-[30%] -right-[5%] w-[45%] h-[55%] rounded-full bg-secondary/[0.05] dark:bg-secondary/[0.025] blur-[150px] animate-pulse" style={{ animationDuration: "18s" }} />
          {/* Blob 3 - uses primary accent color */}
          <div className="absolute -bottom-[15%] left-[20%] w-[35%] h-[45%] rounded-full bg-primary/[0.02] dark:bg-primary/[0.01] blur-[130px] animate-pulse" style={{ animationDuration: "15s" }} />
        </div>
        {children}
      </TweakableContent>
      <ScreenMeteors />
      <MilestoneReward userEmail={ctx.email ?? ""} courseId={id} />
      <InfoPanel
        courseId={id}
        reviewerId={ctx.userId}
        progress={sectionMeta}
        lastSavedAt={lastSavedAt}
        escalations={escalations}
        comments={comments}
      />
    </div>
  );
}
