'use client'

import { useState } from 'react'
import { CourseIssue, IssuePhase, IssueStatus } from '@/lib/issues/types'
import { IssueCard } from './issue-card'
import { IssueDrawer } from './issue-drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface IssueListProps {
  issues: CourseIssue[]
  loading?: boolean
  phase: IssuePhase
  onIssuesChange?: () => void
}

export function IssueList({ issues, loading = false, phase, onIssuesChange }: IssueListProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const filteredIssues = issues.filter((issue) => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
    return true
  })

  // Sort: open first, then in_review, then resolved
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const statusOrder = { open: 0, in_review: 1, resolved: 2 }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  const selectedIssue = issues.find((i) => i.id === selectedIssueId)

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssueStatus | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="escalation">Escalation</SelectItem>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="fix_needed">Fix Needed</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {issues.length === 0 ? 'No issues yet' : 'No issues match your filters'}
            </div>
          ) : (
            sortedIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={selectedIssueId === issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Issue Drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          phase={phase}
          onClose={() => setSelectedIssueId(null)}
          onIssueUpdated={onIssuesChange}
        />
      )}
    </div>
  )
}
