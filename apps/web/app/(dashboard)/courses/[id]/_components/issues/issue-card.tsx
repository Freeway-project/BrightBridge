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
    open: 'bg-red-100 text-red-800 hover:bg-red-200',
    in_review: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    resolved: 'bg-green-100 text-green-800 hover:bg-green-200',
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-800',
    minor: 'bg-yellow-100 text-yellow-800',
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
        'p-3 cursor-pointer transition-all',
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm flex-1 line-clamp-2">{issue.title}</h4>
          <Badge variant="outline" className="shrink-0">
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
