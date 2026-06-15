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
  phase?: IssuePhase
  phases?: IssuePhase[]
  createPhase?: IssuePhase
  title?: string
  userRole?: string
  courseStatus?: CourseStatus
}

export function IssueTracker({
  courseId,
  phase,
  phases,
  createPhase,
  title,
  userRole,
  courseStatus,
}: IssueTrackerProps) {
  const [issues, setIssues] = useState<CourseIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const activePhases = phases?.length ? phases : (phase ? [phase] : undefined)
  const primaryPhase: IssuePhase = createPhase ?? phase ?? activePhases?.[0] ?? 'migration'

  useEffect(() => {
    loadIssues()
  }, [courseId, phase, phases])

  async function loadIssues() {
    try {
      setLoading(true)
      const data = await getIssuesForCourseAction(courseId, {
        phase: activePhases && activePhases.length === 1 ? activePhases[0] : activePhases,
      })
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
    (primaryPhase === 'migration' && ['standard_user', 'admin_full', 'super_admin'].includes(userRole || '')) ||
    (primaryPhase === 'staging' && ['admin_full', 'super_admin'].includes(userRole || '')) ||
    (primaryPhase === 'provision' && ['admin_full', 'super_admin'].includes(userRole || ''))

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
        <h3 className="text-lg font-semibold">{title ?? (activePhases?.includes('provision') ? 'Issues & Questions' : 'Issues')}</h3>
        {canCreateIssue && (
          <IssueCreateDialog
            courseId={courseId}
            phase={primaryPhase}
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
        phase={primaryPhase}
        onIssuesChange={loadIssues}
        canResolve={['super_admin', 'admin_full', 'admin_viewer'].includes(userRole ?? '')}
      />
    </div>
  )
}
