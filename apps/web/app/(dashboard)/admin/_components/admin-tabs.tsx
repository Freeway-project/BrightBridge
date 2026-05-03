"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

type Props = {
  coursesPanel: React.ReactNode
  assignPanel: React.ReactNode
  unassignedCount: number
}

export function AdminTabs({ coursesPanel, assignPanel, unassignedCount }: Props) {
  const [tab, setTab] = useState("courses")

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <TabsList variant="line" className="w-fit">
        <TabsTrigger value="courses">All Courses</TabsTrigger>
        <TabsTrigger value="assign">
          Assign TA
          {unassignedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0 text-[10px] font-semibold text-yellow-700 dark:text-yellow-300">
              {unassignedCount.toLocaleString()}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses">{coursesPanel}</TabsContent>
      <TabsContent value="assign">{assignPanel}</TabsContent>
    </Tabs>
  )
}
