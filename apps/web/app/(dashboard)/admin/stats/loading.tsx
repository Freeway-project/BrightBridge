import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/40 ${className ?? ""}`} />
}

export default function AdminStatsLoading() {
  return (
    <>
      <Topbar title="Stats" subtitle="Pipeline overview, workload, and activity trends" />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* KPI skeleton */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Pulse key={i} className="h-24" />
            ))}
          </div>
          {/* Pipeline skeleton */}
          <Pulse className="h-80" />
          {/* Two charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Pulse className="h-72" />
            <Pulse className="h-72" />
          </div>
          {/* Stuck + funnel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Pulse className="h-64" />
            <Pulse className="h-64" />
          </div>
        </div>
      </TweakableContent>
    </>
  )
}
