"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { issueSchema, type IssueFormValues } from "@/lib/workspace/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type IssueDrawerProps = {
  issue: IssueFormValues | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (issue: IssueFormValues) => void
}

const SEVERITY_OPTIONS = ["minor", "major", "critical"] as const
const STATUS_OPTIONS = ["open", "fixed", "escalated", "resolved"] as const

export function IssueDrawer({ issue, open, onOpenChange, onSave }: IssueDrawerProps) {
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: issue ?? createBlankIssue(),
  })

  useEffect(() => {
    form.reset(issue ?? createBlankIssue())
  }, [form, issue])

  async function handleSubmit(values: IssueFormValues) {
    const valid = await form.trigger()
    if (!valid) return
    onSave(values)
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[340px] sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>{issue ? "Edit Issue" : "New Issue"}</SheetTitle>
        </SheetHeader>

        <form className="space-y-4 px-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <label className="grid gap-1.5 text-sm font-medium">
            Type
            <Input {...form.register("type")} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Location
            <Input {...form.register("location")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Severity
              <Controller
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Status
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Owner
            <Input {...form.register("owner")} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Direct Link
            <Input placeholder="https://..." {...form.register("direct_link")} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Description
            <Textarea rows={6} {...form.register("description")} />
          </label>

          <SheetFooter className="px-0">
            <Button type="submit">Save issue</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function createBlankIssue(): IssueFormValues {
  return {
    id: crypto.randomUUID(),
    type: "General",
    location: "",
    severity: "minor",
    owner: "TA",
    status: "open",
    description: "",
    direct_link: "",
    created_at: new Date().toISOString(),
  }
}
