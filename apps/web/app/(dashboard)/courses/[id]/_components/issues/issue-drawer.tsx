'use client'
import { LottieLoader } from "@/components/ui/lottie-loader"

import { useEffect, useState } from 'react'
import { CourseIssue, IssueComment, IssuePhase, IssueStatus } from '@/lib/issues/types'
import { getIssueWithCommentsAction, updateIssueStatusAction, addCommentAction } from '@/lib/issues/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, MessageCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IssueDrawerProps {
  issue: CourseIssue
  phase: IssuePhase
  onClose?: () => void
  onIssueUpdated?: () => void
  canResolve?: boolean
}

export function IssueDrawer({ issue, phase, onClose, onIssueUpdated, canResolve = false }: IssueDrawerProps) {
  const [fullIssue, setFullIssue] = useState<(CourseIssue & { comments: IssueComment[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [commentBody, setCommentBody] = useState('')

  useEffect(() => {
    loadIssueDetails()
  }, [issue.id])

  async function loadIssueDetails() {
    try {
      setLoading(true)
      const data = await getIssueWithCommentsAction(issue.id)
      setFullIssue(data)
    } catch (error) {
      console.error('Failed to load issue details:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus: IssueStatus) {
    try {
      setUpdatingStatus(true)
      await updateIssueStatusAction(issue.id, newStatus)
      await loadIssueDetails()
      onIssueUpdated?.()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return

    try {
      setCommenting(true)
      await addCommentAction(issue.id, {
        body: commentBody,
        mentions: [],
      })
      setCommentBody('')
      await loadIssueDetails()
      onIssueUpdated?.()
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setCommenting(false)
    }
  }

  if (!fullIssue) return null

  const statusLabel = {
    open: 'Open',
    in_review: 'In Review',
    resolved: 'Resolved',
  }

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
  const phaseLabel = {
    migration: 'Migration',
    staging: 'Staging',
    provision: 'Provision',
  }

  return (
    <div className="w-96 border-l bg-card border-border flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm flex-1 line-clamp-2 text-card-foreground">{fullIssue.title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{typeLabel[fullIssue.type]}</Badge>
          <Badge variant="outline">{phaseLabel[fullIssue.phase]}</Badge>
          <Badge className={`text-xs ${statusColors[fullIssue.status]}`}>
            {statusLabel[fullIssue.status]}
          </Badge>
          <Badge className={`text-xs ${severityColors[fullIssue.severity]}`}>{fullIssue.severity}</Badge>
        </div>

        {/* Status Actions — admin only */}
        {canResolve && (
          <div className="space-y-2">
            {fullIssue.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleStatusChange('in_review')}
                disabled={updatingStatus}
              >
                {updatingStatus && <LottieLoader className="w-3 h-3 mr-2 " />}
                Move to In Review
              </Button>
            )}

            {fullIssue.status === 'in_review' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleStatusChange('resolved')}
                disabled={updatingStatus}
              >
                {updatingStatus && <LottieLoader className="w-3 h-3 mr-2 " />}
                Mark as Resolved
              </Button>
            )}

            {fullIssue.status === 'resolved' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleStatusChange('open')}
                disabled={updatingStatus}
              >
                {updatingStatus && <LottieLoader className="w-3 h-3 mr-2 " />}
                Reopen
              </Button>
            )}
          </div>
        )}

        {/* Issue Details */}
        {(fullIssue.description || fullIssue.location || fullIssue.direct_link) && (
          <div className="text-xs space-y-1 pt-2 border-t">
            {fullIssue.location && (
              <div>
                <span className="text-muted-foreground">Location:</span> <span className="text-foreground">{fullIssue.location}</span>
              </div>
            )}
            {fullIssue.direct_link && (
              <div>
                <a href={fullIssue.direct_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  View in course →
                </a>
              </div>
            )}
            {fullIssue.description && (
              <div>
                <p className="text-foreground/90">{fullIssue.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <ScrollArea className="flex-1 p-4 space-y-3 bg-background/50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LottieLoader className="w-4 h-4  text-muted-foreground" />
          </div>
        ) : fullIssue.comments && fullIssue.comments.length > 0 ? (
          fullIssue.comments.map((comment) => (
            <div key={comment.id} className="space-y-1 text-xs pb-3 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between">
                <span className={cn('font-medium text-card-foreground', comment.is_system_message && 'text-muted-foreground italic')}>
                  {comment.author?.full_name || 'Unknown'}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className={cn('text-foreground/80', comment.is_system_message && 'text-muted-foreground italic')}>
                {comment.body}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageCircle className="w-5 h-5 mb-2" />
            <p className="text-xs">No comments yet</p>
          </div>
        )}
      </ScrollArea>

      {/* Comment Input */}
      <div className="border-t border-border p-4 space-y-2 bg-card">
        <Input
          placeholder="Add a comment..."
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          disabled={commenting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddComment()
            }
          }}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={handleAddComment}
          disabled={!commentBody.trim() || commenting}
        >
          {commenting && <LottieLoader className="w-3 h-3 mr-2 " />}
          Comment
        </Button>
      </div>
    </div>
  )
}
