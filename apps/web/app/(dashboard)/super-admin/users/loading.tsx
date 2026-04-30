import { Topbar } from "@/components/layout/topbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <>
      <Topbar title="User Management" subtitle="Super Admin" />
      <div className="flex-1 p-6 flex flex-col gap-6">
        <Skeleton className="h-48 w-full shrink-0 rounded-lg" />
        
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="border border-border rounded-lg p-4 space-y-4 flex-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </>
  )
}
