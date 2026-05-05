"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookOpen, UserPlus, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  coursesPanel: React.ReactNode
  assignPanel: React.ReactNode
  escalationsPanel: React.ReactNode
  completedPanel: React.ReactNode
  unassignedCount: number
  openEscalationsCount: number
}

export function AdminTabs({
  coursesPanel,
  assignPanel,
  escalationsPanel,
  completedPanel,
  unassignedCount,
  openEscalationsCount,
}: Props) {
  const [tab, setTab] = useState("courses")

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <TabsList className="h-10 w-fit bg-[--surface-0] p-1 rounded-lg">
        <TabsTrigger
          value="courses"
          className="flex items-center gap-2 px-3 data-[state=active]:bg-[--surface-2] data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <BookOpen className="size-4" />
          All Courses
        </TabsTrigger>
        <TabsTrigger
          value="assign"
          className="flex items-center gap-2 px-3 data-[state=active]:bg-[--surface-2] data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <UserPlus className="size-4" />
          Assign TA
          {unassignedCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 rounded-full px-1.5 text-[10px] font-bold">
              {unassignedCount.toLocaleString()}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="escalations"
          className="flex items-center gap-2 px-3 data-[state=active]:bg-[--surface-2] data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <AlertTriangle className="size-4" />
          Escalations
          {openEscalationsCount > 0 && (
            <span className="bg-red-500/20 text-red-400 rounded-full px-1.5 text-[10px] font-bold">
              {openEscalationsCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="flex items-center gap-2 px-3 data-[state=active]:bg-[--surface-2] data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <CheckCircle className="size-4" />
          Provision
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses">{coursesPanel}</TabsContent>
      <TabsContent value="assign">{assignPanel}</TabsContent>
      <TabsContent value="escalations">{escalationsPanel}</TabsContent>
      <TabsContent value="completed">{completedPanel}</TabsContent>
    </Tabs>
  )
}
