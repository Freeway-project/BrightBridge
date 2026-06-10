"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, FileText } from "lucide-react"

type ReviewSummaryProps = {
  course: {
    id: string
    code: string
    title: string
    term?: string
    semester?: string
  }
  metadata?: {
    brightspaceUrl?: string
    moodleUrl?: string
    reviewDate?: string
    timeRequired?: string
  }
  reviewMatrix?: {
    pass: number
    fixNeeded: number
    missing: number
    notApplicable: number
  }
  syllabusgradebook?: {
    taConfirmed?: boolean
    adminConfirmed?: boolean
  }
  issues?: Array<{
    id: string
    type: string
    severity: "minor" | "major" | "critical"
    status: "open" | "fixed" | "escalated" | "resolved"
  }>
  notes?: string
}

export function ReviewSummary({
  course,
  metadata,
  reviewMatrix,
  syllabusgradebook,
  issues = [],
  notes,
}: ReviewSummaryProps) {
  const criticalIssues = issues.filter((i) => i.severity === "critical").length
  const majorIssues = issues.filter((i) => i.severity === "major").length
  const minorIssues = issues.filter((i) => i.severity === "minor").length

  return (
    <div className="space-y-4">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Course Code</p>
              <p className="text-sm font-bold">{course.code}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Title</p>
              <p className="text-sm font-bold">{course.title}</p>
            </div>
            {course.term && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Term</p>
                <p className="text-sm">{course.term}</p>
              </div>
            )}
            {metadata?.reviewDate && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Review Date</p>
                <p className="text-sm">{new Date(metadata.reviewDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Results */}
      {reviewMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Matrix Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-2xl font-bold text-success">{reviewMatrix.pass}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-3 text-center">
                <p className="text-2xl font-bold text-warning">{reviewMatrix.fixNeeded}</p>
                <p className="text-xs text-muted-foreground">Fix Needed</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{reviewMatrix.missing}</p>
                <p className="text-xs text-muted-foreground">Missing</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{reviewMatrix.notApplicable}</p>
                <p className="text-xs text-muted-foreground">N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues Summary */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {criticalIssues > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-2xl font-bold text-destructive">{criticalIssues}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              )}
              {majorIssues > 0 && (
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                  <p className="text-2xl font-bold text-orange-600">{majorIssues}</p>
                  <p className="text-xs text-muted-foreground">Major</p>
                </div>
              )}
              {minorIssues > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <p className="text-2xl font-bold text-yellow-600">{minorIssues}</p>
                  <p className="text-xs text-muted-foreground">Minor</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                  <AlertCircle className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{issue.type}</p>
                    <p className="text-xs text-muted-foreground">{issue.severity}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {issue.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Syllabus & Gradebook */}
      {syllabusgradebook && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Syllabus & Gradebook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              {syllabusgradebook.taConfirmed ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <AlertCircle className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm">TA Confirmation: {syllabusgradebook.taConfirmed ? "Confirmed" : "Pending"}</span>
            </div>
            <div className="flex items-center gap-2">
              {syllabusgradebook.adminConfirmed ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <AlertCircle className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm">Admin Confirmation: {syllabusgradebook.adminConfirmed ? "Confirmed" : "Pending"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              Review Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
