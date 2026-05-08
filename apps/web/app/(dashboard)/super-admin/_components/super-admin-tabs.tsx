"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

type Props = {
  overviewPanel: React.ReactNode
  coursesPanel: React.ReactNode
  usersPanel: React.ReactNode
  assignPanel: React.ReactNode
  escalationsPanel: React.ReactNode
  organizationPanel: React.ReactNode
  migrationPanel: React.ReactNode
  auditPanel: React.ReactNode
  unassignedCount: number
  openEscalationsCount: number
}

export function SuperAdminTabs({
  overviewPanel,
  coursesPanel,
  usersPanel,
  assignPanel,
  escalationsPanel,
  organizationPanel,
  migrationPanel,
  auditPanel,
  unassignedCount,
  openEscalationsCount,
}: Props) {
  const [tab, setTab] = useState("overview")

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-4">
      <div className="border-b border-border w-full">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-y-1 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="assign">
            Assign TA
            {unassignedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0 text-[10px] font-semibold text-yellow-700 dark:text-yellow-300">
                {unassignedCount.toLocaleString()}
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
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">{overviewPanel}</TabsContent>
      <TabsContent value="courses">{coursesPanel}</TabsContent>
      <TabsContent value="users">{usersPanel}</TabsContent>
      <TabsContent value="assign">{assignPanel}</TabsContent>
      <TabsContent value="escalations">{escalationsPanel}</TabsContent>
      <TabsContent value="migration">{migrationPanel}</TabsContent>
      <TabsContent value="organization">{organizationPanel}</TabsContent>
      <TabsContent value="audit">{auditPanel}</TabsContent>
    </Tabs>
  )
}
