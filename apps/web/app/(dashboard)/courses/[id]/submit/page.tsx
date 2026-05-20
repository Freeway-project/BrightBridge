import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getCourseById } from "@/lib/services/courses"
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review"
import { getIssuesForCourseAction } from "@/lib/issues"
import { SubmitPanel } from "../_components/submit-panel"
import { CourseWorkspaceRefreshWrapper } from "../../_components/course-workspace-refresh-wrapper"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SubmitPage({ params }: Props) {
  const { id } = await params
  const ctx = await requireProfile()
  const course = await getCourseById(id, ctx.userId, ctx.profile.role)

  if (!course) notFound()

  const sectionDefs = [
    { key: "course_metadata", label: "Metadata", required: false },
    { key: "review_matrix", label: "Review Matrix", required: false },
    { key: "syllabus_review", label: "Syllabus & Gradebook", required: false },
  ] as const

  const [reviewSections, issues] = await Promise.all([
    Promise.all(
      sectionDefs.map(async (definition) => {
        const section = await getReviewSectionByKey(definition.key)
        const response = section ? await getReviewResponse(id, section.id) : null

        return {
          ...definition,
          complete: Boolean(response && Object.keys(response.response_data ?? {}).length > 0),
        }
      }),
    ),
    getIssuesForCourseAction(id, { phase: "migration" }),
  ])

  const sections = [
    ...reviewSections,
    { key: "issues", label: "Issues", required: false, complete: issues.length === 0 },
  ]

  const reviewData = {
    course: {
      id: course.id,
      code: course.sourceCourseId || "",
      title: course.title,
    },
    issues: issues.map((issue) => ({
      id: issue.id,
      type: issue.type || "general",
      severity: (issue.severity || "minor") as "minor" | "major" | "critical",
      status: (issue.status || "open") as "open" | "fixed" | "escalated" | "resolved",
    })),
  }

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 5 of 5 — Submit" courseStatus={course.status} role={ctx.profile.role} />
      <main className="flex-1 overflow-y-auto p-6">
        <CourseWorkspaceRefreshWrapper
          courseId={id}
          title="Submit Review"
        >
          <SubmitPanel courseId={course.id} courseStatus={course.status} sections={sections} reviewData={reviewData} />
        </CourseWorkspaceRefreshWrapper>
      </main>
    </>
  )
}
