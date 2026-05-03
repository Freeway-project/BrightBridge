import { Topbar } from "@/components/layout/topbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function CoursesLoading() {
  return (
    <>
      <Topbar title="All Courses" subtitle="Super Admin" backHref="/super-admin" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="border border-border rounded-lg p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </>
  )
}
