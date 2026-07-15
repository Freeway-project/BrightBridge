"use client"

import { LayoutList, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HandoffCourseView, InstructorRollup } from "@/lib/admin/queries"
import { HandoffCourseList } from "./handoff-course-list"
import { HandoffInstructorTable } from "./handoff-instructor-table"

interface Props {
  courses: HandoffCourseView[]
  byInstructor: InstructorRollup[]
}

/** Tabbed switch between the per-course list and the per-instructor rollup. */
export function HandoffTabs({ courses, byInstructor }: Props) {
  return (
    <Tabs defaultValue="courses">
      <TabsList>
        <TabsTrigger value="courses">
          <LayoutList className="size-4" />
          Courses ({courses.length})
        </TabsTrigger>
        <TabsTrigger value="instructors">
          <Users className="size-4" />
          By Instructor ({byInstructor.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="courses">
        <HandoffCourseList courses={courses} />
      </TabsContent>

      <TabsContent value="instructors">
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              <Users className="size-3.5 text-muted-foreground/70" />
              Per-Instructor Rollup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HandoffInstructorTable rows={byInstructor} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
