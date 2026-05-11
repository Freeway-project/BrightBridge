'use client'

import { useState } from 'react'
import { IssuePhase, IssueType, IssueSeverity } from '@/lib/issues/types'
import { createIssueAction } from '@/lib/issues/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface IssueCreateDialogProps {
  courseId: string
  phase: IssuePhase
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: () => void
  children?: React.ReactNode
}

export function IssueCreateDialog({
  courseId,
  phase,
  open = false,
  onOpenChange,
  onCreated,
  children,
}: IssueCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(open)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'general' as IssueType,
    severity: 'minor' as IssueSeverity,
    description: '',
    location: '',
    direct_link: '',
  })

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)
      await createIssueAction(courseId, phase, {
        title: formData.title,
        type: formData.type,
        severity: formData.severity,
        description: formData.description || undefined,
        location: formData.location || undefined,
        direct_link: formData.direct_link || undefined,
      })

      setFormData({
        title: '',
        type: 'general',
        severity: 'minor',
        description: '',
        location: '',
        direct_link: '',
      })

      handleOpenChange(false)
      onCreated?.()
    } catch (error) {
      console.error('Failed to create issue:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <div onClick={() => handleOpenChange(true)}>{children}</div>}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription>Add a new issue to this {phase} phase.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Issue title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as IssueType })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escalation">Escalation</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="fix_needed">Fix Needed</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData({ ...formData, severity: v as IssueSeverity })}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="location">Location in Course</Label>
            <Input
              id="location"
              placeholder="e.g., Week 3, Module 2 (optional)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="direct_link">Direct Link</Label>
            <Input
              id="direct_link"
              placeholder="URL to issue (optional)"
              type="url"
              value={formData.direct_link}
              onChange={(e) => setFormData({ ...formData, direct_link: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title || loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
