'use client'

import { CourseIssue } from '@/lib/issues/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IssueCardProps {
  issue: CourseIssue
  isSelected?: boolean
  onClick?: () => void
}

export function IssueCard({ issue, isSelected, onClick }: IssueCardProps) {
  const statusColors = {
    open: 'bg-destructive/20 text-destructive',
    in_review: 'bg-primary/20 text-primary',
    resolved: 'bg-success/20 text-success',
  }

  const severityColors = {
    critical: 'bg-destructive/20 text-destructive font-semibold',
    major: 'bg-warning/20 text-warning',
    minor: 'bg-info/20 text-info',
  }

  const typeLabel = {
    escalation: 'Escalation',
    question: 'Question',
    fix_needed: 'Fix Needed',
    general: 'General',
  }

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer transition-all border',
        isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary' : 'hover:bg-muted/30 border-border'
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm flex-1 line-clamp-2 text-foreground">{issue.title}</h4>
          <Badge variant="outline" className="shrink-0 text-xs">
            {typeLabel[issue.type]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={`text-xs ${statusColors[issue.status]}`}>{issue.status.replace('_', ' ')}</Badge>
          <Badge className={`text-xs ${severityColors[issue.severity]}`}>{issue.severity}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{issue.created_by_profile?.full_name || 'Unknown'}</span>
          <div className="flex items-center gap-1 shrink-0">
            <MessageSquare className="w-3 h-3" />
            <span>{issue.comment_count || 0}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
