'use client'

import { CourseIssue } from '@/lib/issues/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { MessageSquare, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IssueCardProps {
  issue: CourseIssue
  isSelected?: boolean
  onClick?: () => void
}

export function IssueCard({ issue, isSelected, onClick }: IssueCardProps) {
  const statusColors = {
    open: 'bg-destructive/20 text-destructive',
    in_review: 'bg-warning/20 text-warning',
    resolved: 'bg-success/20 text-success',
  }

  const statusIcons = {
    open: <AlertCircle className="w-4 h-4" />,
    in_review: <Clock className="w-4 h-4" />,
    resolved: <CheckCircle2 className="w-4 h-4" />,
  }

  const severityColors = {
    critical: 'bg-destructive/20 text-destructive font-semibold',
    major: 'bg-warning/20 text-warning font-semibold',
    minor: 'bg-info/20 text-info',
  }

  const typeLabel = {
    escalation: 'Escalation',
    question: 'Question',
    fix_needed: 'Fix Needed',
    general: 'General',
  }

  const commentCount = issue.comment_count || 0

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all border-2 hover:shadow-sm',
        isSelected
          ? 'bg-primary/10 border-primary shadow-sm'
          : 'bg-card border-border hover:border-primary/50 hover:bg-muted/20'
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Title and Type */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm flex-1 line-clamp-2 text-foreground">{issue.title}</h4>
          <Badge variant="secondary" className="shrink-0 text-xs whitespace-nowrap">
            {typeLabel[issue.type]}
          </Badge>
        </div>

        {/* Status and Severity */}
        <div className="flex flex-wrap gap-2">
          <Badge className={`text-xs gap-1.5 ${statusColors[issue.status]}`}>
            {statusIcons[issue.status]}
            {issue.status.replace('_', ' ')}
          </Badge>
          <Badge className={`text-xs ${severityColors[issue.severity]}`}>⚠️ {issue.severity}</Badge>
        </div>

        {/* Footer: Author and Comment Count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
          <span className="truncate">{issue.created_by_profile?.full_name || 'Unknown'}</span>
          <div className="flex items-center gap-2">
            {commentCount > 0 && (
              <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full bg-primary/10">
                <MessageSquare className="w-3 h-3 text-primary" />
                <span className="font-medium text-primary">{commentCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
