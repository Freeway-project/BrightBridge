'use client'

import { useState, useEffect } from 'react'
import { CourseIssue, IssuePhase } from '@/lib/issues/types'
import { getIssuesForCourseAction } from '@/lib/issues/actions'
import { IssueList } from './issue-list'
import { IssueCreateDialog } from './issue-create-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface IssueTrackerProps {
  courseId: string
  phase: IssuePhase
  userRole?: string
}

export function IssueTracker({ courseId, phase, userRole }: IssueTrackerProps) {
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
