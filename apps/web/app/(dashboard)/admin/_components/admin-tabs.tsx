"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useStickyTabState } from "@/hooks/use-sticky-tab-state"

type Props = {
  overviewPanel: React.ReactNode
  coursesPanel: React.ReactNode
  assignPanel: React.ReactNode
  instructorPanel: React.ReactNode
  escalationsPanel: React.ReactNode
  completedPanel: React.ReactNode
  institutionPanel: React.ReactNode
  assignmentLogsPanel: React.ReactNode
  sendPanel: React.ReactNode
  // Optional: omitted for read-only (admin_viewer) so the tab is hidden entirely.
  accessLinksPanel?: React.ReactNode
  unassignedCount: number
  openEscalationsCount: number
  readyForInstructorCount: number
}

export function AdminTabs({
  overviewPanel,
  coursesPanel,
  assignPanel,
  instructorPanel,
  escalationsPanel,
  completedPanel,
  institutionPanel,
  assignmentLogsPanel,
  sendPanel,
  accessLinksPanel,
  unassignedCount,
  openEscalationsCount,
  readyForInstructorCount,
}: Props) {
  const [tab, setTab] = useStickyTabState("admin-dashboard", "overview")

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <div className="border-b border-border w-full">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-y-1 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">All Courses</TabsTrigger>
          <TabsTrigger value="assign">
            Assign TA
            {unassignedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0 text-[10px] font-semibold text-yellow-700 dark:text-yellow-300">
                {unassignedCount.toLocaleString()}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="instructor">Instructors</TabsTrigger>
          <TabsTrigger value="send">
            Send to Instructors
            {readyForInstructorCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {readyForInstructorCount.toLocaleString()}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations">
            Escalations
            {openEscalationsCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0 text-[10px] font-semibold text-red-700 dark:text-red-300">
                {openEscalationsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="institution">Institution</TabsTrigger>
          <TabsTrigger value="completed">Provision</TabsTrigger>
          {accessLinksPanel && <TabsTrigger value="access-links">Access Links</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="overview">{overviewPanel}</TabsContent>
      <TabsContent value="courses">{coursesPanel}</TabsContent>
      <TabsContent value="assign" className="space-y-6 outline-none">
        {assignPanel}
        {assignmentLogsPanel}
      </TabsContent>
      <TabsContent value="instructor" className="space-y-6 outline-none">
        {instructorPanel}
        {assignmentLogsPanel}
      </TabsContent>
      <TabsContent value="send">{sendPanel}</TabsContent>
      <TabsContent value="escalations">{escalationsPanel}</TabsContent>
      <TabsContent value="institution">{institutionPanel}</TabsContent>
      <TabsContent value="completed">{completedPanel}</TabsContent>
      {accessLinksPanel && <TabsContent value="access-links">{accessLinksPanel}</TabsContent>}
    </Tabs>
  )
}
