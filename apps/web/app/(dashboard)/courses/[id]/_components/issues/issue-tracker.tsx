'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CourseIssue, IssuePhase } from '@/lib/issues/types'
import { getIssuesForCourseAction } from '@/lib/issues/actions'
import { IssueList } from './issue-list'
import { IssueCreateDialog } from './issue-create-dialog'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle2, ArrowRight } from 'lucide-react'
import type { CourseStatus } from '@coursebridge/workflow'

interface IssueTrackerProps {
  courseId: string
  phase: IssuePhase
  userRole?: string
  courseStatus?: CourseStatus
}

export function IssueTracker({ courseId, phase, userRole, courseStatus }: IssueTrackerProps) {
  const [issues, setIssues] = useState<CourseIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadIssues()
  }, [courseId, phase])

  async function loadIssues() {
    try {
      setLoading(true)
      const data = await getIssuesForCourseAction(courseId, { phase })
      setIssues(data)
    } catch (error) {
      console.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleIssueCreated() {
    setCreateDialogOpen(false)
    loadIssues()
  }

  const canCreateIssue =
    (phase === 'migration' && ['standard_user', 'admin_full', 'super_admin'].includes(userRole || '')) ||
    (phase === 'staging' && ['admin_full', 'super_admin'].includes(userRole || '')) ||
    (phase === 'provision' && ['admin_full', 'super_admin'].includes(userRole || ''))

  const escalations = issues.filter(i => i.type === 'escalation')
  const openEscalations = escalations.filter(i => i.status !== 'resolved')
  const showResubmitNudge =
    !loading &&
    courseStatus === 'admin_changes_requested' &&
    escalations.length > 0 &&
    openEscalations.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Issues</h3>
        {canCreateIssue && (
          <IssueCreateDialog
            courseId={courseId}
            phase={phase}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreated={handleIssueCreated}
          >
            <Button
              size="sm"
              variant="default"
              className="h-8 shrink-0 px-3 font-semibold whitespace-nowrap"
            >
              <Plus className="mr-1.5 size-4 shrink-0" />
              New Issue
            </Button>
          </IssueCreateDialog>
        )}
      </div>

      {showResubmitNudge && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
          <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">All escalations resolved</p>
              <p className="text-xs font-medium opacity-80">You&apos;re clear to send this back to the admin.</p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Link href={`/courses/${courseId}/submit`}>
              Resubmit to Admin
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <IssueList
        issues={issues}
        loading={loading}
        phase={phase}
        onIssuesChange={loadIssues}
        canResolve={['super_admin', 'admin_full', 'admin_viewer'].includes(userRole ?? '')}
      />
    </div>
  )
}
