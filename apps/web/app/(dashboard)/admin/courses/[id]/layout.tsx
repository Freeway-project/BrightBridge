import type { ReactNode } from "react"

interface AdminCourseLayoutProps {
  children: ReactNode
}

export default function AdminCourseLayout({
  children,
}: AdminCourseLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {children}
    </div>
  )
}
