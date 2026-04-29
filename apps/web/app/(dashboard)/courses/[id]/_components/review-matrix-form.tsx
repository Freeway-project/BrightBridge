"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { AlertCircle, ChevronDown, Plus } from "lucide-react"
import { saveDraft } from "@/lib/workspace/actions"
import {
  reviewMatrixSchema,
  type ReviewMatrixFormValues,
} from "@/lib/workspace/schemas"
import type { Issue, IssueLogResponseData, ReviewMatrixStatus } from "@/lib/workspace/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { ReviewTimer } from "./review-timer"

type ReviewMatrixFormProps = {
  courseId: string
  defaultValues: ReviewMatrixFormValues
  initialIssues: Issue[]
}

type ChecklistSection = {
  title: string
  items: { id: string; label: string }[]
}

const CHECKLIST: ChecklistSection[] = [
  {
    title: "A. Course Shell & Navigation",
    items: [
      { id: "A1", label: "Course banner / hero image present and correctly sized" },
      { id: "A2", label: "Navigation bar matches Brightspace standard template" },
      { id: "A3", label: "Welcome page with instructor intro and course overview" },
      { id: "A4", label: "Module folders follow naming convention" },
    ],
  },
  {
    title: "B. Pages & Files",
    items: [
      { id: "B1", label: "All page content readable and correctly formatted" },
      { id: "B2", label: "Files accessible (no broken download links)" },
      { id: "B3", label: "Images have alt text" },
      { id: "B4", label: "No Moodle-specific UI artifacts visible" },
    ],
  },
  {
    title: "C. Links & Embedded Content",
    items: [
      { id: "C1", label: "All hyperlinks resolve (no 404s)" },
      { id: "C2", label: "Embedded videos play correctly" },
      { id: "C3", label: "External tools (Turnitin, Echo360, etc.) configured" },
    ],
  },
]

const STATUS_OPTIONS: { value: ReviewMatrixStatus; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fix_needed", label: "Fix Needed" },
  { value: "missing", label: "Missing" },
  { value: "escalate", label: "Escalate" },
  { value: "na", label: "N/A" },
]

const NEEDS_ISSUE = new Set<ReviewMatrixStatus>(["fix_needed", "missing", "escalate"])

export function ReviewMatrixForm({
  courseId,
  defaultValues,
  initialIssues,
}: ReviewMatrixFormProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [issues, setIssues] = useState(initialIssues)
  const [isPending, startTransition] = useTransition()
  const timerStorageKey = `coursebridge:${courseId}:review-matrix-timer`
  const form = useForm<ReviewMatrixFormValues>({
    resolver: zodResolver(reviewMatrixSchema),
    defaultValues,
  })

  async function handleSave() {
    const valid = await form.trigger()
    if (!valid) return

    setStatus("saving")
    startTransition(async () => {
      try {
        await saveDraft(courseId, "review_matrix", form.getValues())
        setStatus("saved")
      } catch {
        setStatus("error")
      }
    })
  }

  function addIssue(itemId: string, itemLabel: string) {
    const nextIssue: Issue = {
      id: crypto.randomUUID(),
      type: "Review Matrix",
      location: itemId,
      severity: "major",
      owner: "TA",
      status: "open",
      description: itemLabel,
      direct_link: "",
      created_at: new Date().toISOString(),
    }
    const nextIssues = [...issues, nextIssue]
    setIssues(nextIssues)
    startTransition(async () => {
      try {
        await saveDraft(courseId, "general_notes", { issues: nextIssues } satisfies IssueLogResponseData)
      } catch {
        setStatus("error")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Review Matrix</CardTitle>
            <SaveState isPending={isPending} status={status} />
          </div>
          <ReviewTimer label="Review matrix time" storageKey={timerStorageKey} />
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onBlur={() => void handleSave()}>
          {CHECKLIST.map((section) => (
            <Collapsible defaultOpen key={section.title}>
              <div className="rounded-lg border border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                  {section.title}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[42%]">Item</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Direct Link</TableHead>
                        <TableHead className="w-[92px] text-right">Issue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.items.map((item) => {
                        const index = defaultValues.items.findIndex((value) => value.item_id === item.id)
                        const statusValue = form.watch(`items.${index}.status`)
                        const needsIssue = NEEDS_ISSUE.has(statusValue)
                        const notesError = form.formState.errors.items?.[index]?.notes?.message

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline">{item.id}</Badge>
                                <p className="text-sm">{item.label}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Controller
                                control={form.control}
                                name={`items.${index}.status`}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  className={needsIssue && notesError ? "border-orange-500 ring-2 ring-orange-500/20" : ""}
                                  placeholder={needsIssue ? "Required" : "Optional"}
                                  {...form.register(`items.${index}.notes`)}
                                />
                                {notesError ? (
                                  <p className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertCircle className="size-3" />
                                    {notesError}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input placeholder="https://..." {...form.register(`items.${index}.direct_link`)} />
                            </TableCell>
                            <TableCell className="text-right">
                              {needsIssue ? (
                                <Button
                                  onClick={() => addIssue(item.id, item.label)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <Plus className="size-3.5" />
                                  Issue
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          <div className="flex justify-end pt-2">
            <Button disabled={isPending} onClick={() => void handleSave()} type="button">
              Save draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function buildReviewMatrixDefaults(
  saved?: Partial<ReviewMatrixFormValues> | null,
): ReviewMatrixFormValues {
  const savedItems = new Map((saved?.items ?? []).map((item) => [item.item_id, item]))
  return {
    items: CHECKLIST.flatMap((section) =>
      section.items.map((item) => ({
        item_id: item.id,
        status: savedItems.get(item.id)?.status ?? "na",
        notes: savedItems.get(item.id)?.notes ?? "",
        direct_link: savedItems.get(item.id)?.direct_link ?? "",
      })),
    ),
  }
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
  return <p className="text-xs text-muted-foreground">Auto-saves on blur</p>
}
