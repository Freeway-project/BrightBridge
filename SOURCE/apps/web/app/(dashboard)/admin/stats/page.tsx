import { requireAnyRole, requireProfile } from "@/lib/auth/context"
import { getAdminStatsData } from "@/lib/admin/queries"
import { Topbar } from "@/components/layout/topbar"
import { TweakableContent } from "@/components/shared/tweakable-content"
import { StatsOverview } from "@/components/admin/stats/stats-overview"
import { StagePipeline } from "@/components/admin/stats/stage-pipeline"
import { WorkloadChart } from "@/components/admin/stats/workload-chart"
import { ActivityTrend } from "@/components/admin/stats/activity-trend"
import { StuckCoursesList } from "@/components/admin/stats/stuck-courses-list"
import { CompletionFunnel } from "@/components/admin/stats/completion-funnel"
import { StatusPieChart } from "@/components/admin/stats/status-pie"

export default async function AdminStatsPage() {
  const context = await requireProfile()
  requireAnyRole(context, ["admin_full", "super_admin"])

  const data = await getAdminStatsData()

  return (
    <>
      <Topbar title="Stats" subtitle="Pipeline overview, workload, and activity trends" role={context.profile.role} />
      <TweakableContent className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* KPI cards */}
          <StatsOverview
            totalCourses={data.totalCourses}
            statusCounts={data.statusCounts}
            taWorkload={data.taWorkload}
            stuckCourses={data.stuckCourses}
          />

          {/* Full-width pipeline */}
          <StagePipeline statusCounts={data.statusCounts} totalCourses={data.totalCourses} />

          {/* Workload + Activity side by side */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WorkloadChart taWorkload={data.taWorkload} />
            <ActivityTrend auditEvents={data.auditEvents} />
          </div>

          {/* Pie + Funnel side by side */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StatusPieChart statusCounts={data.statusCounts} totalCourses={data.totalCourses} />
            <CompletionFunnel statusCounts={data.statusCounts} totalCourses={data.totalCourses} />
          </div>

          {/* Stuck courses full width */}
          <StuckCoursesList stuckCourses={data.stuckCourses} />
        </div>
      </TweakableContent>
    </>
  )
}
