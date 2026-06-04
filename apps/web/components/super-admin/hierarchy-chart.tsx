"use client"

import { OrgChart, type RawOrgNode } from "@/components/ui/org-chart"

/**
 * Renders the organizational hierarchy as an interactive org chart inside the
 * Super Admin "Hierarchy" tab. Data is mapped server-side via
 * toOrgChartNodes() in lib/super-admin/queries.ts.
 */
export function HierarchyChart({ nodes }: { nodes: RawOrgNode[] }) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No organizational units yet. Seed the hierarchy to populate this chart.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Colleges, schools, departments, and their members. Click the +/- buttons to expand or
        collapse a branch.
      </p>
      <div className="h-[calc(100vh-13rem)] overflow-hidden rounded-lg border border-border">
        <OrgChart data={nodes} />
      </div>
    </div>
  )
}
