import { Topbar } from "@/components/layout/topbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function OverviewLoading() {
  return (
    <>
      <Topbar title="System Overview" subtitle="Super Admin" />
      <div className="flex-1 p-6 space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-1" />
          <Skeleton className="h-64 w-full lg:col-span-2" />
        </div>
      </div>
    </>
  )
}
