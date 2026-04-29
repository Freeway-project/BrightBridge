import { notFound } from "next/navigation"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/auth/context"
import { getCourseById } from "@/lib/services/courses"
import { getReviewResponse, getReviewSectionByKey } from "@/lib/services/review"
import { SubmitPanel } from "../_components/submit-panel"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SubmitPage({ params }: Props) {
  const { id } = await params
  const ctx = await requireProfile()
  const course = await getCourseById(id, ctx.userId)

  if (!course) notFound()

  const sectionDefs = [
    { key: "course_metadata", label: "Metadata", required: true },
    { key: "review_matrix", label: "Review Matrix", required: true },
    { key: "syllabus_review", label: "Syllabus & Gradebook", required: false },
    { key: "general_notes", label: "Issue Log", required: false },
  ] as const

  const sections = await Promise.all(
    sectionDefs.map(async (definition) => {
      const section = await getReviewSectionByKey(definition.key)
      const response = section ? await getReviewResponse(id, section.id) : null

      return {
        ...definition,
        complete: Boolean(response && Object.keys(response.response_data ?? {}).length > 0),
      }
    }),
  )

  return (
    <>
      <Topbar title="Course Workspace" subtitle="Step 5 of 5 — Submit" />
      <main className="flex-1 overflow-y-auto p-6">
        <SubmitPanel courseId={course.id} courseStatus={course.status} sections={sections} />
      </main>
    </>
  )
}
