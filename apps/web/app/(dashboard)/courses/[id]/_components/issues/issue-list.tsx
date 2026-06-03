import { LottieLoader } from "@/components/ui/lottie-loader"
'use client'

import { useState, useEffect } from 'react'
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
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface IssueListProps {
  issues: CourseIssue[]
  loading?: boolean
  phase: IssuePhase
  onIssuesChange?: () => void
  canResolve?: boolean
}

export function IssueList({ issues, loading = false, phase, onIssuesChange, canResolve = false }: IssueListProps) {
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

  // Auto-select the first (latest/most recent) issue on load or when issues change
  useEffect(() => {
    if (sortedIssues.length > 0 && !selectedIssueId) {
      setSelectedIssueId(sortedIssues[0].id)
    }
  }, [sortedIssues, selectedIssueId])

  const selectedIssue = issues.find((i) => i.id === selectedIssueId)

  const getStatusIcon = (status: IssueStatus) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-destructive" />
      case 'in_review':
        return <Clock className="w-4 h-4 text-warning" />
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-success" />
    }
  }

  const getStatusLabel = (status: IssueStatus) => {
    const labels = { open: 'Open', in_review: 'In Review', resolved: 'Resolved' }
    return labels[status]
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0 bg-card/45 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-2xl shadow-black/20">
        {/* Filter Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h4 className="text-sm font-semibold text-foreground/80">Filter Issues</h4>
          <span className="text-xs text-muted-foreground">{sortedIssues.length} total</span>
        </div>

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
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <LottieLoader className="w-6 h-6  text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading issues...</p>
            </div>
          ) : sortedIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground/60">
                {issues.length === 0 ? 'No issues yet. Create one to get started! 🚀' : 'No issues match your filters'}
              </p>
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
          canResolve={canResolve}
        />
      )}
    </div>
  )
}
