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
}: Props) {
  const [tab, setTab] = useStickyTabState(storageKey, defaultTab)

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
