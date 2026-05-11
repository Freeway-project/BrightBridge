"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookOpen, UserPlus, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  overviewPanel: React.ReactNode
  coursesPanel: React.ReactNode
  assignPanel: React.ReactNode
  instructorPanel: React.ReactNode
  escalationsPanel: React.ReactNode
  completedPanel: React.ReactNode
  migrationPanel: React.ReactNode
  assignmentLogsPanel: React.ReactNode
  unassignedCount: number
  openEscalationsCount: number
}

export function AdminTabs({
  overviewPanel,
  coursesPanel,
  assignPanel,
  instructorPanel,
  escalationsPanel,
  completedPanel,
  migrationPanel,
  assignmentLogsPanel,
  unassignedCount,
  openEscalationsCount,
}: Props) {
  const [tab, setTab] = useState("overview")

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
          <TabsTrigger value="escalations">
            Escalations
            {openEscalationsCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0 text-[10px] font-semibold text-red-700 dark:text-red-300">
                {openEscalationsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="completed">Provision</TabsTrigger>
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
      <TabsContent value="escalations">{escalationsPanel}</TabsContent>
      <TabsContent value="migration">{migrationPanel}</TabsContent>
      <TabsContent value="completed">{completedPanel}</TabsContent>
    </Tabs>
  )
}
