"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

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
      <div className="border-b border-border w-full bg-card/30 rounded-t-xl px-2">
        <TabsList variant="line" className="h-12 w-full flex-wrap justify-start gap-x-2 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="assign" className="gap-2">
            Assign TA
            {unassignedCount > 0 && (
              <Badge variant="count" className="bg-warning text-warning-foreground font-bold">
                {unassignedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="gap-2">
            Escalations
            {openEscalationsCount > 0 && (
              <Badge variant="count" className="bg-destructive text-destructive-foreground animate-pulse font-bold">
                {openEscalationsCount}
              </Badge>
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
