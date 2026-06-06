import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PhaseBreakdown } from "@/components/admin/stats/phase-breakdown"
import { AuditView } from "@/components/super-admin/audit-view"
import { getPhaseBreakdown, type CourseStatus } from "@coursebridge/workflow"
import type { SuperAdminData } from "@/lib/super-admin/queries"
import { buildProvostSummary } from "@/lib/provost/summary"
import { ProvostWelcomeBanner } from "./provost-welcome-banner"
import { ProvostKpiRow } from "./provost-kpi-row"
import { ProvostExplore } from "./provost-explore"

/**
 * Provost executive dashboard. Scan-first oversight: welcome banner + hero KPI
 * row (bespoke), then quick links to explore the institution, the status
 * breakdown, and the institution-wide "who did what" activity feed. All
 * theme-aware via tokens.
 */
export function ProvostDashboard({
  data,
  provostName,
}: {
  data: SuperAdminData
  provostName: string | null
}) {
  const summary = buildProvostSummary(data, provostName)

  const countByStatus: Partial<Record<CourseStatus, number>> = Object.fromEntries(
    data.statusCounts.map((s) => [s.status, s.count]),
  )
  const breakdown = getPhaseBreakdown(countByStatus)

  return (
    <div className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6">
      <ProvostWelcomeBanner headline={summary.headline} />

      <ProvostKpiRow summary={summary} />

      <ProvostExplore />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PhaseBreakdown breakdown={breakdown} />
        </div>

        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="px-4 pb-3 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity — Who Did What
            </CardTitle>
          </CardHeader>
          <CardContent className="border-t border-border p-0">
            <AuditView data={data} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
