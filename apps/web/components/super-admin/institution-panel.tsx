"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"
import { OverviewView } from "@/components/super-admin/overview-view"
import { OrganizationView } from "@/components/super-admin/organization-view"
import type { SuperAdminData } from "@/lib/super-admin/queries"

type InstitutionTab = "overview" | "organization"

type Props = {
  data: SuperAdminData
  /** Unique per host so super-admin / admin / provost don't share tab state. */
  storageKey?: string
  defaultTab?: InstitutionTab
  /**
   * Hide the review-status Overview tab. The provost's Overview duplicates their
   * /provost dashboard, so /provost/org shows just the Organization manager.
   */
  showOverview?: boolean
}

/**
 * Institution-wide oversight bundled as one component: review-status Overview
 * plus org-unit/leadership management. Composed from the existing small views so
 * super-admin, admin, and provost all render the exact same panel (write
 * controls are gated server-side by requireOrgManager, which allows admin_full +
 * provost). The org-chart Hierarchy lives on its own /hierarchy sidebar route.
 */
export function InstitutionPanel({
  data,
  storageKey = "institution-panel",
  defaultTab = "overview",
  showOverview = true,
}: Props) {
  const [tab, setTab] = useStickyTabState(storageKey, showOverview ? defaultTab : "organization")

  // With no Overview tab there's nothing to switch between — render the org
  // manager directly without the tab chrome.
  if (!showOverview) {
    return <OrganizationView data={data} />
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <div className="border-b border-border w-full">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-y-1 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <OverviewView data={data} />
      </TabsContent>
      <TabsContent value="organization">
        <OrganizationView data={data} />
      </TabsContent>
    </Tabs>
  )
}
