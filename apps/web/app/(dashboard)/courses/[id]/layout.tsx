import type { ReactNode } from "react"

interface CourseWorkspaceLayoutProps {
  children: ReactNode
  params: Promise<{ id: string }>
}

export default async function CourseWorkspaceLayout({ children }: CourseWorkspaceLayoutProps) {
  // TODO: 3-column workspace layout (step nav left, form center, info panel right)
  return (
    <div className="flex flex-1 overflow-hidden">
      {children}
    </div>
  )
}
