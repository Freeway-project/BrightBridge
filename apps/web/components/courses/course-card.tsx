import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { getCourseStatusLabel, type CourseStatus } from "@coursebridge/workflow"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface CourseCardProps {
  course: {
    id: string
    sourceCourseId: string | null
    title: string
    term: string | null
    status: CourseStatus
    updatedAt: string
  }
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="overflow-hidden border-border bg-card hover:border-primary/20 transition-colors">
      <CardHeader className="p-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">
                {course.sourceCourseId || "NO-CODE"}
              </h3>
              <span className="text-base text-muted-foreground">{course.title}</span>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {course.term || "No Term"} • Last updated {new Date(course.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={`/courses/${course.id}`}>
              View Review
              <ChevronRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/50">
          <StatusItem label="Course Info" value="Complete" status="success" />
          <StatusItem label="Migration Notes" value="Available" status="success" />
          <StatusItem label="Checklist" value="In Progress" status="warning" />
          <StatusItem label="Gradebook" value="Pending" status="muted" />
          <StatusItem label="Final Approval" value="Waiting" status="info" />
        </div>
      </CardContent>
    </Card>
  )
}

function StatusItem({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status: 'success' | 'warning' | 'error' | 'muted' | 'info' 
}) {
  const statusClasses = {
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    error: "text-red-500 bg-red-500/10 border-red-500/20",
    muted: "text-muted-foreground bg-muted/50 border-transparent",
    info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  }

  return (
    <div className="p-3 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn(
        "text-xs font-bold px-2 py-0.5 rounded-full w-fit border",
        statusClasses[status]
      )}>
        {value}
      </span>
    </div>
  )
}

import { cn } from "@/lib/utils"
