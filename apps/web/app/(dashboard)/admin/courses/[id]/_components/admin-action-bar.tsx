"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { approveReviewAction, requestFixesAction } from "../../../actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, MessageSquare } from "lucide-react"

export function AdminActionBar({ courseId }: { courseId: string }) {
  const [fixesOpen, setFixesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      await approveReviewAction(courseId)
      router.push("/admin")
    })
  }

  function handleSendFixes() {
    startTransition(async () => {
      await requestFixesAction(courseId, note)
      router.push("/admin")
    })
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        {!fixesOpen ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-muted-foreground">
              Review the TA&apos;s work above, then approve or request changes.
            </p>
            <Button disabled={isPending} onClick={handleApprove}>
              <CheckCircle2 className="mr-1.5 size-4" />
              {isPending ? "Approving..." : "Approve"}
            </Button>
            <Button variant="outline" disabled={isPending} onClick={() => setFixesOpen(true)}>
              <MessageSquare className="mr-1.5 size-4" />
              Request Fixes
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Note for TA</p>
            <Textarea
              autoFocus
              placeholder="Describe what needs to be corrected..."
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button variant="destructive" disabled={isPending} onClick={handleSendFixes}>
                {isPending ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="ghost" disabled={isPending} onClick={() => { setFixesOpen(false); setNote("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
