"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { saveDraft } from "@/lib/workspace/actions"
import type { Issue } from "@/lib/workspace/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createBlankIssue, IssueDrawer } from "./issue-drawer"

type IssueLogTableProps = {
  courseId: string
  defaultIssues: Issue[]
}

const ALL = "all"

export function IssueLogTable({ courseId, defaultIssues }: IssueLogTableProps) {
  const [issues, setIssues] = useState(defaultIssues)
  const [selected, setSelected] = useState<Issue | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [severity, setSeverity] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      const searchMatch =
        query.trim() === "" ||
        issue.description.toLowerCase().includes(query.toLowerCase()) ||
        issue.location.toLowerCase().includes(query.toLowerCase()) ||
        issue.type.toLowerCase().includes(query.toLowerCase())
      const severityMatch = severity === ALL || issue.severity === severity
      const statusMatch = status === ALL || issue.status === status
      return searchMatch && severityMatch && statusMatch
    })
  }, [issues, query, severity, status])

  function saveIssues(nextIssues: Issue[]) {
    setIssues(nextIssues)
    setSaveState("saving")
    startTransition(async () => {
      try {
        await saveDraft(courseId, "general_notes", { issues: nextIssues })
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    })
  }

  function openNewIssue() {
    setSelected(createBlankIssue())
    setDrawerOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Issue Log</CardTitle>
          <div className="flex items-center gap-3">
            <SaveState isPending={isPending} status={saveState} />
            <Button onClick={openNewIssue} size="sm" type="button">
              <Plus className="size-3.5" />
              New Issue
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search issues"
            value={query}
          />
          <Select onValueChange={setSeverity} value={severity}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All severities</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setStatus} value={status}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead className="w-[140px]">Severity</TableHead>
              <TableHead className="w-[140px]">Owner</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((issue) => (
              <TableRow
                className="cursor-pointer"
                key={issue.id}
                onClick={() => {
                  setSelected(issue)
                  setDrawerOpen(true)
                }}
              >
                <TableCell>
                  <p className="text-sm font-medium">{issue.type}</p>
                  <p className="text-xs text-muted-foreground">{issue.location}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {issue.description}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={issue.severity === "critical" ? "destructive" : "outline"}>
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{issue.owner}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{issue.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No issues found.
          </div>
        ) : null}
      </CardContent>

      <IssueDrawer
        issue={selected}
        onOpenChange={setDrawerOpen}
        onSave={(issue) => {
          const exists = issues.some((item) => item.id === issue.id)
          const nextIssues = exists
            ? issues.map((item) => (item.id === issue.id ? issue : item))
            : [...issues, issue]
          saveIssues(nextIssues)
          setDrawerOpen(false)
        }}
        open={drawerOpen}
      />
    </Card>
  )
}

function SaveState({
  isPending,
  status,
}: {
  isPending: boolean
  status: "idle" | "saving" | "saved" | "error"
}) {
  if (isPending || status === "saving") return <p className="text-xs text-muted-foreground">Saving...</p>
  if (status === "saved") return <p className="text-xs text-green-600">Saved</p>
  if (status === "error") return <p className="text-xs text-destructive">Save failed</p>
  return <p className="text-xs text-muted-foreground">Auto-saves after edits</p>
}
