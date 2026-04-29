import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { requireProfile } from "@/lib/auth/context"
import { getCourseById } from "@/lib/services/courses"
import { WorkspaceNav } from "./_components/workspace-nav"

interface CourseWorkspaceLayoutProps {
  children: ReactNode
  params: Promise<{ id: string }>
}

export default async function CourseWorkspaceLayout({
  children,
  params,
}: CourseWorkspaceLayoutProps) {
  const { id } = await params
  const ctx = await requireProfile()
  const course = await getCourseById(id, ctx.userId)

  if (!course) notFound()

  return (
    <div className="flex flex-1 overflow-hidden">
      <WorkspaceNav courseId={id} courseTitle={course.title} courseStatus={course.status} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
