import { notFound } from "next/navigation"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getCourseExportData } from "@/lib/admin/course-export"
import { PrintToolbar } from "./_components/print-toolbar"
import { CoursePdfDocument } from "./_components/course-pdf-document"

interface Props {
  params: Promise<{ id: string }>
}

// Always render fresh — the export should reflect the latest saved review data.
export const dynamic = "force-dynamic"

export default async function CoursePrintPage({ params }: Props) {
  const { id } = await params
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const data = await getCourseExportData(id)
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PrintToolbar />
      <CoursePdfDocument
        course={data.course}
        instructorName={data.instructorName}
        meta={data.meta}
        matrix={data.matrix}
        syllabus={data.syllabus}
        metaStatus={data.metaStatus}
        matrixStatus={data.matrixStatus}
        syllabusStatus={data.syllabusStatus}
        issues={data.issues}
        comments={data.comments}
        generatedAt={new Date().toISOString()}
      />
    </div>
  )
}
