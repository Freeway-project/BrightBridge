import type { CourseStatus } from "@coursebridge/workflow"

export const STATUS_BADGE_CLASS: Record<CourseStatus, string> = {
  course_created:          "bg-muted text-muted-foreground border-transparent",
  assigned_to_ta:          "bg-muted text-muted-foreground border-transparent",
  ta_review_in_progress:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  submitted_to_admin:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  admin_changes_requested: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready_for_instructor:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  sent_to_instructor:      "bg-purple-500/15 text-purple-400 border-purple-500/20",
  instructor_questions:    "bg-orange-500/15 text-orange-400 border-orange-500/20",
  instructor_approved:     "bg-green-500/15 text-green-400 border-green-500/20",
  final_approved:          "bg-green-500/15 text-green-400 border-green-500/20",
}

export const TA_COURSE_ACTIONS: Partial<Record<CourseStatus, {
  label: string
  variant: "default" | "outline" | "ghost" | "destructive"
}>> = {
  assigned_to_ta:          { label: "Start Review",  variant: "outline" },
  ta_review_in_progress:   { label: "Continue →",    variant: "default" },
  submitted_to_admin:      { label: "View",          variant: "ghost" },
  admin_changes_requested: { label: "Fix Issues →",  variant: "destructive" },
}
