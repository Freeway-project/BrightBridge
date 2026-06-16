import type { CourseStatus } from "@coursebridge/workflow"
import { getPhaseBreakdown } from "@coursebridge/workflow"
import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminStatsData } from "@/lib/admin/queries"
import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { ActivityTrend } from "@/components/admin/stats/activity-trend"
import { OperationalStatusChart } from "@/components/admin/stats/operational-status-chart"
import { PipelineTimeline } from "@/components/admin/stats/pipeline-timeline"
import { StatsOverview } from "@/components/admin/stats/stats-overview"
import { StuckCoursesList } from "@/components/admin/stats/stuck-courses-list"
import { WorkloadChart } from "@/components/admin/stats/workload-chart"

export default async function AdminStatsPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const data = await getAdminStatsData()

  const countByStatus: Partial<Record<CourseStatus, number>> = Object.fromEntries(
    data.statusCounts.map((s) => [s.status, s.count]),
  )
  const phases = getPhaseBreakdown(countByStatus)
  return (
    <>
      <Topbar
        title="Stats"
        subtitle="Current operational queue, handoff readiness, and bottlenecks"
        role={context.profile.role}
      />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <div className="mx-auto max-w-7xl space-y-6">
          <PipelineTimeline phases={phases} totalCourses={data.totalCourses} />

          <StatsOverview totalCourses={data.totalCourses} phases={phases} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
            <OperationalStatusChart phases={phases} totalCourses={data.totalCourses} />
            <WorkloadChart taWorkload={data.taWorkload} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActivityTrend auditEvents={data.auditEvents} />
            <StuckCoursesList stuckCourses={data.stuckCourses} totalStuck={data.stuckCount} />
          </div>
        </div>
      </TweakableContent>
    </>
  )
}
